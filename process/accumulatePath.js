export function accumulatePath({ currentPath, newSegments, forward, sort }) {
  for (let i = 0; i < newSegments.length; ++i) {
    const segment = newSegments[i];
    if (currentPath.length === 0) {
      currentPath.unshift(segment);
    } else if (sort) {
      const [xNew, yNew] = segment[0];
      let minDistance = Number.MAX_VALUE;
      let minSegmentIndex = -1;
      for (let j = 0; j < currentPath.length; ++j) {
        const [xOld, yOld] = currentPath[j][0];
        const dx = xNew - xOld;
        const dy = yNew - yOld;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
          minDistance = distance;
          minSegmentIndex = j;
        }
      }
      if (forward) {
        currentPath.splice(minSegmentIndex + 1, 0, segment);
      } else {
        currentPath.splice(minSegmentIndex, 0, segment);
      }
    } else {
      if (forward) {
        currentPath.push(segment);
      } else {
        currentPath.unshift(segment);
      }
    }
  }
  return currentPath;
}
