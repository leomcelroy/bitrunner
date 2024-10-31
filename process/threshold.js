// @typedef img = { data: u8[], width: number, height: number }

// @type { img: img, threshold: number } -> img
export function threshold({ img, threshold }) {
  const buf = img.data;
  const w = img.width;
  const h = img.height;
  const t = threshold;

  let r, g, b, a, i;
  for (var row = 0; row < h; ++row) {
    for (var col = 0; col < w; ++col) {
      r = buf[(h - 1 - row) * w * 4 + col * 4 + 0];
      g = buf[(h - 1 - row) * w * 4 + col * 4 + 1];
      b = buf[(h - 1 - row) * w * 4 + col * 4 + 2];
      a = buf[(h - 1 - row) * w * 4 + col * 4 + 3];
      i = (r + g + b) / (3 * 255);

      let val;
      if (a === 0) {
        val = 255;
      } else if (i >= t) {
        // > or >=
        val = 255;
      } else {
        val = 0;
      }

      buf[(h - 1 - row) * w * 4 + col * 4 + 0] = val;
      buf[(h - 1 - row) * w * 4 + col * 4 + 1] = val;
      buf[(h - 1 - row) * w * 4 + col * 4 + 2] = val;
      buf[(h - 1 - row) * w * 4 + col * 4 + 3] = 255;
    }
  }

  return { data: buf, width: w, height: h };
}
