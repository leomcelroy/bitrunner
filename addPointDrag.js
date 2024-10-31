import { createListener } from "./createListener.js";

export function addPointDrag(el) {
  function getPoint(e) {
    let rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    return el.panZoomFns.getPoint(x, y);
  }

  const listen = createListener(el);

  let dragging = false;
  listen("mousedown", "[draggable-toolhead]", (e) => {
    dragging = true;
    el.panZoomFns.togglePanZoom(true);
  });

  listen("mousemove", "", (e) => {
    if (dragging === false) return;

    let [x, y] = getPoint(e);
    y = -y;

    const [bedX, bedY] = STATE.bedSize;
    STATE.toolheadPos[0] = Math.min(Math.max(0, Number(x.toFixed(0))), bedX);
    STATE.toolheadPos[1] = Math.min(Math.max(0, Number(y.toFixed(0))), bedY);
  });

  listen("mouseup", "", (e) => {
    dragging = false;
    el.panZoomFns.togglePanZoom(false);
  });
}
