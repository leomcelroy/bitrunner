export function mergePolylines(polylines) {
  if (polylines.length === 0) return [];

  const arePointsEqual = ([x1, y1], [x2, y2]) => {
    return x1 === x2 && y1 === y2;
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

      // Check all possible connections and maintain direction
      if (arePointsEqual(currEnd, otherStart)) {
        // Append other in its original direction
        stack[0] = [...current, ...other.slice(1)];
        stack.splice(i, 1);
        foundMerge = true;
        break;
      } else if (arePointsEqual(currStart, otherEnd)) {
        // Prepend other in its original direction
        stack[0] = [...other, ...current.slice(1)];
        stack.splice(i, 1);
        foundMerge = true;
        break;
      } else if (arePointsEqual(currStart, otherStart)) {
        // Prepend reversed other to ensure same direction
        stack[0] = [...other.slice().reverse(), ...current.slice(1)];
        stack.splice(i, 1);
        foundMerge = true;
        break;
      } else if (arePointsEqual(currEnd, otherEnd)) {
        // Append reversed other to ensure same direction
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
