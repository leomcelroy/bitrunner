export function addPanZoom(el) {
  let mousedown = false;
  let scale = 1;
  let pointX = 0;
  let pointY = 0;
  let start = { x: 0, y: 0 };

  el.addEventListener("mousedown", (e) => {
    mousedown = true;
    start.x = (e.offsetX - pointX) / scale;
    start.y = (e.offsetY - pointY) / scale;
  });

  el.addEventListener("mousemove", (e) => {
    if (!mousedown) return;

    pointX = e.offsetX - start.x * scale;
    pointY = e.offsetY - start.y * scale;
  });

  window.addEventListener("mouseup", () => {
    mousedown = false;
  });

  el.addEventListener("wheel", (e) => {
    e.preventDefault();

    let xs = (e.offsetX - pointX) / scale;
    let ys = (e.offsetY - pointY) / scale;

    const ZOOM_SCALE = 1.05;
    if (e.deltaY < 0) scale *= ZOOM_SCALE;
    else scale /= ZOOM_SCALE;

    pointX = e.offsetX - xs * scale;
    pointY = e.offsetY - ys * scale;
  });

  const getTransform = () => ({
    scale,
    x: pointX,
    y: pointY,
  });

  const setTransform = (ops) => {
    if (ops.scale) scale = ops.scale;
    if (ops.x) pointX = ops.x;
    if (ops.y) pointY = ops.y;
  };

  return {
    getTransform,
    setTransform,
  };
}
