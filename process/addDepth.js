export function addDepth({ path, cutDepth, maxDepth }) {
  const newPath = [];
  for (let i = 0; i < path.length; ++i) {
    let depth = cutDepth;
    while (depth <= maxDepth) {
      const depthValue = -Math.round(depth);
      const newSegment = path[i].map((point) => point.concat(depthValue));
      newPath.push(newSegment);
      if (depth === maxDepth) break;
      depth += cutDepth;
      if (depth > maxDepth) depth = maxDepth;
    }
  }
  return newPath;
}
