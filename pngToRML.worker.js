import { pngToRML, updateConfig } from "./pngToRML.js";

self.onmessage = function (event) {
  const { traceImg, outlineImg, origin, settingsValues } = event.data;

  updateConfig({
    offset_x_in: origin[0] / 25.4,
    offset_y_in: origin[1] / 25.4,
    ...settingsValues,
    zero_z_in: -origin[2] / 25.4,
  });

  const result = pngToRML(
    traceImg.data,
    traceImg.width,
    traceImg.height,
    outlineImg.data,
    outlineImg.width,
    outlineImg.height,
  );

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <circle cx="100" cy="100" r="80" stroke="black" stroke-width="3" fill="blue" />
      <text x="50" y="110" font-size="20" fill="white">Toolpath Generated</text>
    </svg>
  `;

  self.postMessage({ result });
};
