import { createListener } from "./createListener.js";
import { addDropUpload } from "./addDropUpload.js";
import { addPanZoom } from "./addPanZoom-og.js";
import { html, render } from "./libs/lit-html.js";
import { drawCanvas } from "./drawCanvas.js";
import { view } from "./view.js";
import { initWebUSB } from "./initWebUSB.js";
import { readPNG } from "./readPNG.js";
import { addPointDrag } from "./addPointDrag.js";
import { popupRunTraces } from "./popupRunTraces.js";
// import { popupShowPreview } from "./popupShowPreview.js";
import { popupJobRunning } from "./popupJobRunning.js";
import { raster2d } from "./process/raster2d.js";
import { generateRML } from "./process/generateRML.js";
import { fetchSettings } from "./fetchSettings.js";

export const STATE = {
  imgs: [],
  webUSB: null,
  canvas: null,
  ctx: null,
  pxToMM: (1 / 1000) * 25.4,
  toolheadPos: [0, 0, 50],
  origin: [0, 0, 50],
  bedSize: [203, 125], // [232.2, 156.6],
  getTransform: () => ({ x: 0, y: 0, scale: 1 }),
  toolpathType: "",
  toolpath: null,
  isGenerating: false,
};

window.STATE = STATE;

render(view(STATE), document.body);

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const cover = document.querySelector("[canvas-cover]");

STATE.canvas = canvas;
STATE.ctx = ctx;

const panZoomFns = addPanZoom(cover);
cover.panZoomFns = panZoomFns;
STATE.getTransform = panZoomFns.getTransform;

setTimeout(() => {
  const limits = {
    x: [0, STATE.bedSize[0]],
    y: [0, STATE.bedSize[1]],
  };

  panZoomFns.setScaleXY(limits);
}, 0);

addDropUpload(document.body, ({ img, data }) => {
  STATE.imgs = [{ img, data }];
});

addPointDrag(cover);

const webUSB = initWebUSB();
STATE.webUSB = webUSB;

// need to pass vender id
// try {
//   webUSB.connect();
// } catch (err) {
//   console.log("no device detected")
// }

console.log(webUSB);

renderLoop();

function renderLoop() {
  render(view(STATE), document.body);
  requestAnimationFrame(renderLoop);
  drawCanvas(STATE);
}

function patchState(callbackFn) {
  callbackFn(state);
  renderApp(state);
}

function renderApp() {}

const listen = createListener(document.body);

listen("mousedown", "[connect-btn]", (e) => {
  const { webUSB } = STATE;

  if (!webUSB.isConnected) webUSB.connect();
  else webUSB.disconnect();
});

listen("mousedown", "[move-tool-btn]", (e) => {
  const { toolheadPos, webUSB } = STATE;

  const [x0, y0, z0] = toolheadPos.map((x, i) => x * 100);

  const zJog = 200 + z0;

  const rml = `
    !MC0;
    PA;
    PA;
    VS10;
    !VZ10;
    !PZ0,${zJog};
    PU${x0},${y0};
    Z${x0},${y0},${z0};
    \u0004
  `;

  webUSB.send(rml);
});

let currentWorker = null;
listen("mousedown", "[generate-toolpath]", (e) => {
  const settings = fetchSettings();
  console.log(settings);

  if (STATE.toolpathType === "2D") {
    if (currentWorker) currentWorker.terminate();

    const args = {
      img: STATE.imgs[0].data,
      origin: STATE.origin,
      pxToMM: STATE.pxToMM,
      ...settings,
    };

    // const result = raster2d(args);
    // STATE.toolpath = result;

    const worker = new Worker("./process/raster2d.worker.js", {
      type: "module",
    });
    currentWorker = worker;
    console.log(currentWorker);

    worker.onmessage = function (event) {
      const { result } = event.data;

      worker.terminate();

      STATE.isGenerating = false;
      currentWorker = null;

      STATE.toolpath = result;
      // console.log(result.vectors.length, result.marchedLines.length);
      // STATE.toolpath.vectors = result.marchedLines;

      console.log(result);
    };

    STATE.isGenerating = true;
    worker.postMessage(args);
  }
});

listen("mousedown", "[start-cut-btn]", (e) => {
  const { webUSB, origin, toolheadPos } = STATE;

  if (webUSB === null || !webUSB.isConnected) {
    alert("Machine is not connected.");
  }

  origin[2] = toolheadPos[2];

  popupRunTraces(STATE, {
    onConfirm() {
      const { rml, time } = generateRML({
        origin,
        ...STATE.toolpath,
      });
      console.log(rml);
      webUSB.send(rml);
      popupJobRunning(STATE, time);
    },
  });
});

setupCanvasResizeObserver(canvas, () => {
  const bb = canvas.getBoundingClientRect();
  canvas.width = bb.width;
  canvas.height = bb.height;
});

function setupCanvasResizeObserver(canvas, onResize) {
  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const rect = entry.contentRect;
      onResize(rect.width, rect.height);
    }
  });

  resizeObserver.observe(canvas);

  return resizeObserver;
}

// maybe save position every 2 seconds
