import { mergePolylines } from "./mergePolylines.js";

export function marchingSquares(f32Array, isoValue) {
  const { data, width, height } = f32Array;
  const step = 0.5;

  const RULES = {
    0b0000: () => [],
    0b0001: ([x, y]) => [
      [
        [x - step, y],
        [x, y + step],
      ],
    ],
    0b0010: ([x, y]) => [
      [
        [x, y + step],
        [x + step, y],
      ],
    ],
    0b0100: ([x, y]) => [
      [
        [x + step, y],
        [x, y - step],
      ],
    ],
    0b1000: ([x, y]) => [
      [
        [x, y - step],
        [x - step, y],
      ],
    ],
    0b0011: ([x, y]) => [
      [
        [x - step, y],
        [x + step, y],
      ],
    ],
    0b0101: ([x, y]) => [
      [
        [x - step, y],
        [x, y - step],
      ],
      [
        [x + step, y],
        [x, y + step],
      ],
    ],
    0b1001: ([x, y]) => [
      [
        [x, y - step],
        [x, y + step],
      ],
    ],
    0b0110: ([x, y]) => [
      [
        [x, y + step],
        [x, y - step],
      ],
    ],
    0b1010: ([x, y]) => [
      [
        [x - step, y],
        [x, y - step],
      ],
      [
        [x + step, y],
        [x, y + step],
      ],
    ],
    0b1100: ([x, y]) => [
      [
        [x + step, y],
        [x - step, y],
      ],
    ],
    0b0111: ([x, y]) => [
      [
        [x - step, y],
        [x, y - step],
      ],
    ],
    0b1011: ([x, y]) => [
      [
        [x, y - step],
        [x + step, y],
      ],
    ],
    0b1110: ([x, y]) => [
      [
        [x, y + step],
        [x - step, y],
      ],
    ],
    0b1101: ([x, y]) => [
      [
        [x + step, y],
        [x, y + step],
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
    (neighbors[0] >= isoValue ? 8 : 0) |
    (neighbors[1] >= isoValue ? 4 : 0) |
    (neighbors[2] >= isoValue ? 2 : 0) |
    (neighbors[3] >= isoValue ? 1 : 0);

  const allLines = [];
  const seen = new Uint8Array(width * height);

  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const index = y * width + x;
      if (seen[index]) continue;

      const neighbors = getNeighbors(y, x);
      const code = getCode(neighbors);
      const rule = RULES[code];
      let direction = DIRECTION[code];
      const lines = rule([x, y]);
      seen[index] = 1;

      if (lines.length > 0) {
        allLines.push(...lines);
      }

      if (direction) {
        const startX = x;
        const startY = y;
        while (direction) {
          let nextX = x;
          let nextY = y;

          if (direction === "up") nextY--;
          else if (direction === "down") nextY++;
          else if (direction === "right") nextX++;
          else if (direction === "left") nextX--;

          if (nextX < 1 || nextX >= width || nextY < 1 || nextY >= height)
            break;

          const newIndex = nextY * width + nextX;
          if (seen[newIndex]) break;

          const newNeighbors = getNeighbors(nextY, nextX);
          const newCode = getCode(newNeighbors);
          const newRule = RULES[newCode];
          direction = DIRECTION[newCode];
          seen[newIndex] = 1;

          const newLines = newRule([nextX, nextY]);
          const lastPolyLine = allLines[allLines.length - 1];
          newLines.forEach((line) => {
            lastPolyLine.push(line[1]);
          });

          x = nextX;
          y = nextY;
        }
        x = startX;
        y = startY;
      }
    }
  }

  const merged = mergePolylines(allLines);

  return merged;
}
