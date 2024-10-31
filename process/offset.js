// @typedef distanceField = { data: f32[], width: number, height: number }

// @type distanceField, number -> img
export function offset(distanceField, offset) {
  var buf = distanceField.data;
  var w = distanceField.width;
  var h = distanceField.height;

  var output = new Uint8ClampedArray(4 * h * w);
  for (var row = 0; row < h; ++row) {
    for (var col = 0; col < w; ++col) {
      if (buf[(h - 1 - row) * w + col] <= offset) {
        output[(h - 1 - row) * w * 4 + col * 4 + 0] = 255;
        output[(h - 1 - row) * w * 4 + col * 4 + 1] = 255;
        output[(h - 1 - row) * w * 4 + col * 4 + 2] = 255;
        output[(h - 1 - row) * w * 4 + col * 4 + 3] = 255;
      } else {
        output[(h - 1 - row) * w * 4 + col * 4 + 0] = 0;
        output[(h - 1 - row) * w * 4 + col * 4 + 1] = 0;
        output[(h - 1 - row) * w * 4 + col * 4 + 2] = 0;
        output[(h - 1 - row) * w * 4 + col * 4 + 3] = 255;
      }
    }
  }

  return {
    data: output,
    width: w,
    height: h,
  };
}
