import { addDepth } from "./addDepth.js";

export function generateRML({
  origin,
  vectors,
  accumulatedPath,
  finalPath,
  pxToMM,
  jogHeight = 2, // mm
  speed = 4, // mm/sec
} = {}) {
  const rolandUnitsFactor = 100;
  const pxToUnit = pxToMM * rolandUnitsFactor;
  speed = speed * rolandUnitsFactor;

  const [ox, oy, oz] = origin;

  const adjustedFinalPath = JSON.parse(JSON.stringify(finalPath));

  adjustedFinalPath.forEach((path) => {
    path.forEach((pt) => {
      pt[2] += oz / pxToMM;
    });
  });

  console.log({
    finalPath,
    adjustedFinalPath,
    jogHeight,
    oz,
    rolandUnitsFactor,
  });

  let rml = "PA;PA;";
  rml += `VS${speed / rolandUnitsFactor};!VZ${speed / rolandUnitsFactor};`;
  const jogZ = (jogHeight + oz) * rolandUnitsFactor;
  rml += `!PZ0,${Math.floor(jogZ)};!MC1;\n`;

  let totalSeconds = 0;

  let toolPosition = adjustedFinalPath
    .at(0)
    .at(0)
    .map((n) => n * pxToUnit);

  function moveTo(x, y, z) {
    const [tx, ty, tz] = toolPosition;
    const dist = Math.sqrt((x - tx) ** 2 + (y - ty) ** 2 + (z - tz) ** 2);

    toolPosition = [x, y, z];
    return dist;
  }

  adjustedFinalPath.forEach((segment) => {
    const [x, y, z] = segment[0];
    let xScaled = x * pxToUnit;
    let yScaled = y * pxToUnit;
    let zScaled = z * pxToUnit;

    rml += `PU${xScaled.toFixed(0)},${yScaled.toFixed(0)};\n`;
    totalSeconds += moveTo(xScaled, yScaled, jogZ) / speed;

    const makeLine = (x, y, z) =>
      `Z${x.toFixed(0)},${y.toFixed(0)},${z.toFixed(0)};\n`;

    for (let i = 0; i < segment.length; i++) {
      const [x, y, z] = segment[i];
      xScaled = x * pxToUnit;
      yScaled = y * pxToUnit;
      zScaled = z * pxToUnit;

      rml += makeLine(xScaled, yScaled, zScaled);
      totalSeconds += moveTo(xScaled, yScaled, zScaled) / speed;
    }

    rml += `PU${xScaled.toFixed(0)},${yScaled.toFixed(0)};\n`;
    totalSeconds += moveTo(xScaled, yScaled, jogZ) / speed;
  });

  const homeX = ox * rolandUnitsFactor;
  const homeY = oy * rolandUnitsFactor;
  const homeZ = oz * rolandUnitsFactor;
  rml += `PA;PA;PU${homeX},${homeY};!MC0;\n`;
  totalSeconds += moveTo(homeX, homeY, jogZ) / speed;

  const time = toHHMMSS(totalSeconds);

  return {
    rml,
    time,
  };
}

function toHHMMSS(sec_num) {
  sec_num = Math.floor(sec_num);
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor((sec_num - hours * 3600) / 60);
  const seconds = sec_num - hours * 3600 - minutes * 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
