import { raster2d } from "./raster2d.js";

self.onmessage = function (event) {
  const result = raster2d(event.data);

  self.postMessage({ result });
};
