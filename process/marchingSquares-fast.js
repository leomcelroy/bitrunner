import { mergePolylines } from "./mergePolylines.js";

export function marchingSquares(f32Array, isoValue) {
  const { data, width, height } = f32Array;
  const step = 0.5;

  function interpolate(side, neighbors) {
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
    0b0001: ([x, y], neighbors) => [
      [
        [x - step, y - interpolate(3, neighbors)],
        [x + interpolate(2, neighbors), y + step],
      ],
    ],
    0b0010: ([x, y], neighbors) => [
      [
        [x + interpolate(2, neighbors), y + step],
        [x + step, y + interpolate(1, neighbors)],
      ],
    ],
    0b0100: ([x, y], neighbors) => [
      [
        [x + step, y + interpolate(1, neighbors)],
        [x + interpolate(0, neighbors), y - step],
      ],
    ],
    0b1000: ([x, y], neighbors) => [
      [
        [x + interpolate(0, neighbors), y - step],
        [x - step, y - interpolate(3, neighbors)],
      ],
    ],
    0b0011: ([x, y], neighbors) => [
      [
        [x - step, y - interpolate(3, neighbors)],
        [x + step, y + interpolate(1, neighbors)],
      ],
    ],
    0b0101: ([x, y], neighbors) => [
      [
        [x - step, y - interpolate(3, neighbors)],
        [x + interpolate(0, neighbors), y - step],
      ],
      [
        [x + step, y + interpolate(1, neighbors)],
        [x + interpolate(2, neighbors), y + step],
      ],
    ],
    0b1001: ([x, y], neighbors) => [
      [
        [x + interpolate(0, neighbors), y - step],
        [x + interpolate(2, neighbors), y + step],
      ],
    ],
    0b0110: ([x, y], neighbors) => [
      [
        [x + interpolate(2, neighbors), y + step],
        [x + interpolate(0, neighbors), y - step],
      ],
    ],
    0b1010: ([x, y], neighbors) => [
      [
        [x + interpolate(2, neighbors), y + step],
        [x - step, y - interpolate(3, neighbors)],
      ],
      [
        [x + interpolate(0, neighbors), y - step],
        [x + step, y + interpolate(1, neighbors)],
      ],
    ],
    0b1100: ([x, y], neighbors) => [
      [
        [x + step, y + interpolate(1, neighbors)],
        [x - step, y - interpolate(3, neighbors)],
      ],
    ],
    0b0111: ([x, y], neighbors) => [
      [
        [x - step, y - interpolate(3, neighbors)],
        [x + interpolate(0, neighbors), y - step],
      ],
    ],
    0b1011: ([x, y], neighbors) => [
      [
        [x + interpolate(0, neighbors), y - step],
        [x + step, y + interpolate(1, neighbors)],
      ],
    ],
    0b1110: ([x, y], neighbors) => [
      [
        [x + interpolate(2, neighbors), y + step],
        [x - step, y - interpolate(3, neighbors)],
      ],
    ],
    0b1101: ([x, y], neighbors) => [
      [
        [x + step, y + interpolate(1, neighbors)],
        [x + interpolate(2, neighbors), y + step],
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

  const getNeighbors = (row, col) => [
    getGrey(row - 1, col - 1),
    getGrey(row - 1, col),
    getGrey(row, col),
    getGrey(row, col - 1),
  ];

  const getCode = (neighbors) =>
    (neighbors[0] >= isoValue ? 8 : 0) | // 1000
    (neighbors[1] >= isoValue ? 4 : 0) | // 0100
    (neighbors[2] >= isoValue ? 2 : 0) | // 0010
    (neighbors[3] >= isoValue ? 1 : 0); // 0001

  const allLines = [];
  const seen = new Uint8Array(width * height);
  // const seenSet = new Set();

  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const index = y * width + x;
      if (seen[index]) continue;
      // if (seenSet.has(index)) continue;

      const neighbors = getNeighbors(y, x);
      const code = getCode(neighbors);
      const rule = RULES_INTERPOLATED[code];
      let direction = DIRECTION[code];
      const lines = rule([x, y], neighbors);
      seen[index] = 1;
      // seenSet.add(index);

      if (lines.length > 0) {
        allLines.push(...lines);
      }

      if (direction) {
        const startX = x;
        const startY = y;
        while (direction) {
          if (direction === "up") y--;
          else if (direction === "down") y++;
          else if (direction === "right") x++;
          else if (direction === "left") x--;

          const newIndex = y * width + x;
          if (seen[newIndex]) break;
          // if (seenSet.has(newIndex)) break;

          const newNeighbors = getNeighbors(y, x);
          const newCode = getCode(newNeighbors);
          const newRule = RULES_INTERPOLATED[newCode];
          direction = DIRECTION[newCode];
          seen[newIndex] = 1;
          // seenSet.add(newIndex);

          const newLines = newRule([x, y], newNeighbors);
          const lastPolyLine = allLines[allLines.length - 1];
          newLines.forEach((line) => {
            lastPolyLine.push(line[1]);
          });
        }
        x = startX;
        y = startY;
      }
    }
  }

  const merged = mergePolylines(allLines);

  return merged;
}
