import { mergePolylines } from "./mergePolylines.js";

export function marchingSquares(f32Array, isoValue) {
  const { data, width, height } = f32Array;
  const step = 0.5;

  // Reusable arrays to avoid reallocation
  const neighbors = new Float32Array(4);
  const newNeighbors = new Float32Array(4);

  // Reuse the same array for lines to reduce garbage collection
  const lines = [];

  function interpolate(side) {
    const pairs = [
      [neighbors[0], neighbors[1]], // side 0
      [neighbors[1], neighbors[2]], // side 1
      [neighbors[3], neighbors[2]], // side 2
      [neighbors[3], neighbors[0]], // side 3
    ];
    const [y0, y1] = pairs[side];

    let x0 = -1;
    let x1 = 1;
    let m = (y1 - y0) / (x1 - x0);
    let b = y1 - m * x1;
    let pointFiveX = (isoValue - b) / m;
    return step * pointFiveX;
  }

  const RULES_INTERPOLATED = {
    0b0000: () => [],
    0b0001: ([x, y]) => [
      [
        [x - step, y - interpolate(3)],
        [x + interpolate(2), y + step],
      ],
    ],
    0b0010: ([x, y]) => [
      [
        [x + interpolate(2), y + step],
        [x + step, y + interpolate(1)],
      ],
    ],
    0b0100: ([x, y]) => [
      [
        [x + step, y + interpolate(1)],
        [x + interpolate(0), y - step],
      ],
    ],
    0b1000: ([x, y]) => [
      [
        [x + interpolate(0), y - step],
        [x - step, y - interpolate(3)],
      ],
    ],
    0b0011: ([x, y]) => [
      [
        [x - step, y - interpolate(3)],
        [x + step, y + interpolate(1)],
      ],
    ],
    0b0101: ([x, y]) => [
      [
        [x - step, y - interpolate(3)],
        [x + interpolate(0), y - step],
      ],
      [
        [x + step, y + interpolate(1)],
        [x + interpolate(2), y + step],
      ],
    ],
    0b1001: ([x, y]) => [
      [
        [x + interpolate(0), y - step],
        [x + interpolate(2), y + step],
      ],
    ],
    0b0110: ([x, y]) => [
      [
        [x + interpolate(2), y + step],
        [x + interpolate(0), y - step],
      ],
    ],
    0b1010: ([x, y]) => [
      [
        [x + interpolate(2), y + step],
        [x - step, y - interpolate(3)],
      ],
      [
        [x + interpolate(0), y - step],
        [x + step, y + interpolate(1)],
      ],
    ],
    0b1100: ([x, y]) => [
      [
        [x + step, y + interpolate(1)],
        [x - step, y - interpolate(3)],
      ],
    ],
    0b0111: ([x, y]) => [
      [
        [x - step, y - interpolate(3)],
        [x + interpolate(0), y - step],
      ],
    ],
    0b1011: ([x, y]) => [
      [
        [x + interpolate(0), y - step],
        [x + step, y + interpolate(1)],
      ],
    ],
    0b1110: ([x, y]) => [
      [
        [x + interpolate(2), y + step],
        [x - step, y - interpolate(3)],
      ],
    ],
    0b1101: ([x, y]) => [
      [
        [x + step, y + interpolate(1)],
        [x + interpolate(2), y + step],
      ],
    ],
    0b1111: () => [],
  };

  const DIRECTION = {
    0b0000: undefined,
    0b0001: "down",
    0b0010: "right",
    0b0100: "up",
    0b1000: "left",
    0b0011: "right",
    0b0101: undefined,
    0b1001: "down",
    0b0110: "up",
    0b1010: undefined,
    0b1100: "left",
    0b0111: "up",
    0b1011: "right",
    0b1110: "left",
    0b1101: "down",
    0b1111: undefined,
  };

  const getGrey = (row, col) => data[row * width + col];

  function getNeighbors(row, col) {
    neighbors[0] = getGrey(row - 1, col - 1);
    neighbors[1] = getGrey(row - 1, col);
    neighbors[2] = getGrey(row, col);
    neighbors[3] = getGrey(row, col - 1);
  }

  function getCode() {
    return (
      (neighbors[0] >= isoValue ? 8 : 0) |
      (neighbors[1] >= isoValue ? 4 : 0) |
      (neighbors[2] >= isoValue ? 2 : 0) |
      (neighbors[3] >= isoValue ? 1 : 0)
    );
  }

  const allLines = [];
  const seen = new Uint8Array(width * height);

  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const index = y * width + x;
      if (seen[index]) continue;

      getNeighbors(y, x);
      const code = getCode();
      const rule = RULES_INTERPOLATED[code];
      let direction = DIRECTION[code];

      const newLines = rule([x, y]);
      seen[index] = 1;

      if (newLines.length > 0) {
        allLines.push(...newLines);
      }

      if (direction) {
        const startX = x,
          startY = y;
        while (direction) {
          switch (direction) {
            case "up":
              y--;
              break;
            case "down":
              y++;
              break;
            case "right":
              x++;
              break;
            case "left":
              x--;
              break;
          }

          const newIndex = y * width + x;
          if (seen[newIndex]) break;

          getNeighbors(y, x);
          const newCode = getCode();
          direction = DIRECTION[newCode];
          seen[newIndex] = 1;

          const nextLines = RULES_INTERPOLATED[newCode]([x, y]);
          const lastPolyLine = allLines[allLines.length - 1];
          nextLines.forEach((line) => lastPolyLine.push(line[1]));
        }
        x = startX;
        y = startY;
      }
    }
  }

  return mergePolylines(allLines);
}
