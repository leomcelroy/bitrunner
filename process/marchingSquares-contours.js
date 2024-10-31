export function marchingSquares(f32Array, isoValue) {
  const { data, width, height } = f32Array;
  const step = 0.5;

  function interpolate(side, neighbors) {
    const pairs = [
      [neighbors[0], neighbors[1]], // side 0 (top-left to top-right)
      [neighbors[1], neighbors[2]], // side 1 (top-right to bottom-right)
      [neighbors[3], neighbors[2]], // side 2 (bottom-left to bottom-right)
      [neighbors[3], neighbors[0]], // side 3 (bottom-left to top-left)
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

  let allPolylines = [];

  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const neighbors = getNeighbors(y, x);
      const code = getCode(neighbors);
      const rule = RULES_INTERPOLATED[code];
      const segments = rule([x, y], neighbors);

      // add segments to allPoylines
      if (segments.length > 0) {
        allPolylines.push(...segments);

        // recursively merge allPolylines on a stack
        allPolylines = mergePolylines(allPolylines);
      }
    }
  }

  return allPolylines;
}

export function mergePolylines(polylines) {
  if (polylines.length === 0) return [];

  const arePointsEqual = ([x1, y1], [x2, y2], epsilon = 0.0001) => {
    return Math.abs(x1 - x2) < epsilon && Math.abs(y1 - y2) < epsilon;
  };

  let stack = [...polylines];
  let finalLines = [];

  while (stack.length > 0) {
    let current = stack[0];
    let foundMerge = false;

    // Get endpoints of current line
    const currStart = current[0];
    const currEnd = current[current.length - 1];

    // Check against all other lines in stack
    for (let i = 1; i < stack.length; i++) {
      const other = stack[i];
      const otherStart = other[0];
      const otherEnd = other[other.length - 1];

      // Check all possible connections
      if (arePointsEqual(currEnd, otherStart)) {
        // current -> other
        stack[0] = [...current, ...other.slice(1)];
        stack.splice(i, 1);
        foundMerge = true;
        break;
      } else if (arePointsEqual(currStart, otherEnd)) {
        // other -> current
        stack[0] = [...other, ...current.slice(1)];
        stack.splice(i, 1);
        foundMerge = true;
        break;
      } else if (arePointsEqual(currStart, otherStart)) {
        // reversed other -> current
        stack[0] = [...other.slice().reverse(), ...current.slice(1)];
        stack.splice(i, 1);
        foundMerge = true;
        break;
      } else if (arePointsEqual(currEnd, otherEnd)) {
        // current -> reversed other
        stack[0] = [...current, ...other.slice().reverse().slice(1)];
        stack.splice(i, 1);
        foundMerge = true;
        break;
      }
    }

    // If no merge found, move current line to final lines
    if (!foundMerge) {
      finalLines.push(current);
      stack.splice(0, 1);
    }
  }

  return finalLines;
}
