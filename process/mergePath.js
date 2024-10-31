export function mergePath({ path, mergeDistance }) {
  const mergeThreshold = mergeDistance;
  let i = 0;
  while (i < path.length - 1) {
    const [xOld, yOld] = path[i][path[i].length - 1];
    const [xNew, yNew] = path[i + 1][0];
    const dx = xNew - xOld;
    const dy = yNew - yOld;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < mergeThreshold) {
      path.splice(i, 2, path[i].concat(path[i + 1]));
    } else {
      i += 1;
    }
  }
  return path;
}
