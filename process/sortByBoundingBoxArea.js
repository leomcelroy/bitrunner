export function sortByBoundingBoxArea(paths) {
  const result = paths.slice().sort((a, b) => {
    const areaA = getBoundingBoxArea(a);
    const areaB = getBoundingBoxArea(b);
    return areaA - areaB;
  });

  return result;
}

function getBoundingBoxArea(path) {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const [x, y] of path) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return (maxX - minX) * (maxY - minY);
}
