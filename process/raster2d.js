import { distanceTransform } from "./distanceTransform.js";
import { edgeDetect } from "./edgeDetect.js";
import { offset } from "./offset.js";
import { orientEdges } from "./orientEdges.js";
import { threshold } from "./threshold.js";
import { vectorize } from "./vectorize.js";
import { accumulatePath } from "./accumulatePath.js";
import { mergePath } from "./mergePath.js";
import { addDepth } from "./addDepth.js";
import { marchingSquares } from "./marchingSquares.js";
import { marchingSquares as ms } from "./marchingSquares-fast.js";
import { simplify } from "./simplify.js";

export function raster2d({
  img,
  diameter,
  cutDepth,
  maxDepth,
  offsetNumber,
  stepover,
  origin,
  pxToMM,
  direction, // climb | conventional
  thresholdValue = 0.5,
  pathOrder = "forward", // reverse | forward
  pathMerge = true,
  sortDistance = true,
  speed = 4, // mm/sec
} = {}) {
  const conventional = direction === "conventional";

  const [ox, oy, oz] = origin;

  let accumulatedPath = [];

  const thresholded = threshold({ img, threshold: thresholdValue });

  const distanceField = distanceTransform(thresholded);

  // const vectors = [];
  const marchedLines = [];
  for (let i = 0; i < offsetNumber; i++) {
    const currentOffsetDistance =
      (diameter * stepover * i + diameter / 2) / pxToMM;

    // console.time("marching squares");
    const msLines = ms(distanceField, currentOffsetDistance);

    // const ensuredClockwise = ensureClockwiseLoops(msLines);

    const simplified = msLines.map((line) => {
      line = simplify(line, 0.1);

      line.forEach((pt) => {
        pt[1] *= -1;
        pt[1] += img.height;

        pt[0] += ox / pxToMM;
        pt[1] += oy / pxToMM;
      });

      return conventional ? line : line.reverse();
    });
    marchedLines.push(...simplified);
    // console.timeEnd("marching squares");

    // old
    // const offsetted = offset(distanceField, currentOffsetDistance);

    // const edges = edgeDetect(offsetted);

    // const orientedEdges = orientEdges(edges);

    // const newVectors = vectorize({
    //   img: orientedEdges,
    //   vectorFit: 1,
    //   sort: true,
    // });

    // newVectors.forEach((path) => {
    //   path.forEach((pt) => {
    //     pt[0] += ox / pxToMM;
    //     pt[1] += oy / pxToMM;
    //   });
    // });

    // vectors.push(...newVectors);
    // old

    accumulatedPath = accumulatePath({
      currentPath: accumulatedPath,
      newSegments: simplified, // was newVectors
      forward: pathOrder === "forward",
      sort: sortDistance,
    });
  }

  if (pathMerge) {
    accumulatedPath = mergePath({
      path: accumulatedPath,
      mergeDistance: diameter / pxToMM,
    });
  }

  const finalPath = addDepth({
    path: accumulatedPath,
    cutDepth: cutDepth / pxToMM,
    maxDepth: maxDepth / pxToMM,
  });

  return {
    marchedLines,
    // vectors,
    vectors: marchedLines,
    accumulatedPath,
    finalPath,
    pxToMM,
    speed,
  };
}

export function ensureClockwiseLoops(polylines) {
  const arePointsEqual = ([x1, y1], [x2, y2]) => {
    return x1 === x2 && y1 === y2;
  };

  const isClockwise = (polyline) => {
    let sum = 0;
    for (let i = 0; i < polyline.length - 1; i++) {
      const [x1, y1] = polyline[i];
      const [x2, y2] = polyline[i + 1];
      sum += (x2 - x1) * (y2 + y1); // Simplified area calculation
    }
    return sum < 0; // A negative sum means clockwise.
  };

  return polylines.map((polyline) => {
    // Check if the polyline forms a closed loop
    if (arePointsEqual(polyline[0], polyline[polyline.length - 1])) {
      // If the loop is not clockwise, reverse it
      if (!isClockwise(polyline)) {
        return polyline.reverse();
      }
    }
    return polyline;
  });
}

function appendImageToBody({ data, width, height }) {
  // Create a new canvas element
  const canvas = document.createElement("canvas");

  // Set the canvas dimensions
  canvas.width = width;
  canvas.height = height;

  // Get the canvas 2D drawing context
  const ctx = canvas.getContext("2d");

  // Create an ImageData object from the provided image data
  const imageData = new ImageData(new Uint8ClampedArray(data), width, height);

  // Put the image data onto the canvas
  ctx.putImageData(imageData, 0, 0);

  // Append the canvas to the body of the document
  document.body.appendChild(canvas);
}
