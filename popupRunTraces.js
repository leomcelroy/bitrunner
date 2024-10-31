import { html, render } from "./libs/lit-html.js";

export function popupRunTraces(state, ops = {}) {
  const onConfirm = ops.onConfirm ?? null;

  const modalTemplate = html`
    <div
      class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <!-- Exit Button -->
        <button
          class="absolute top-2 right-2 text-gray-500 hover:text-black"
          style="font-size: 1.5rem;"
          @click=${closeModal}
        >
          &times;
        </button>

        <h2 class="text-xl mb-4">Position Toolhead to Surface</h2>
        <p class="mb-4">
          Please move the tool bit until it's touching the stock surface, then
          press the button below.
        </p>

        <!-- Right Control Group -->
        <div class="flex flex-col items-center mb-4">
          <button
            class="bg-gray-200 hover:bg-gray-300 w-16 h-16 rounded move-btn"
            data-direction="up"
            @click=${() => moveTool("+z")}
          >
            +z
          </button>
          <div class="h-2"></div>
          <button
            class="bg-gray-200 hover:bg-gray-300 w-16 h-16 rounded move-btn"
            data-direction="down"
            @click=${() => moveTool("-z")}
          >
            -z
          </button>
        </div>

        <!-- Step Size Input -->
        <div class="flex items-center mb-4">
          <label for="stepSize" class="mr-2">Stepsize (mm):</label>
          <input
            id="stepSize2"
            type="number"
            value="1"
            min="0.1"
            step="0.1"
            class="border border-gray-400 p-1 rounded w-20"
          />
        </div>

        <!-- Tool Touching Surface Button -->
        <div class="flex items-center justify-center mt-4">
          <button
            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            @click=${confirmToolTouching}
          >
            Start Cut
          </button>
        </div>
      </div>
    </div>
  `;

  const modalWrapper = document.createElement("div");
  document.body.appendChild(modalWrapper);
  render(modalTemplate, modalWrapper);

  function closeModal() {
    document.body.removeChild(modalWrapper);
  }

  function moveTool(direction) {
    const stepSize = parseFloat(document.getElementById("stepSize2").value);
    console.log(`Moving tool ${direction} by ${stepSize}`);

    const { toolheadPos, origin, webUSB } = state;

    if (direction === "+x") {
      toolheadPos[0] += stepSize;
    }
    if (direction === "-x") {
      toolheadPos[0] -= stepSize;
    }
    if (direction === "+y") {
      toolheadPos[1] += stepSize;
    }
    if (direction === "-y") {
      toolheadPos[1] -= stepSize;
    }
    if (direction === "+z") {
      toolheadPos[2] += stepSize;
      origin[2] = toolheadPos[2];
    }
    if (direction === "-z") {
      toolheadPos[2] -= stepSize;
      origin[2] = toolheadPos[2];
    }

    const [x0, y0, z0] = toolheadPos.map((x, i) => x * 100);

    const rml = `
      !MC0;
      PA;
      PA;
      VS10;
      !VZ10;
      Z${x0},${y0},${z0};
      \u0004
    `;

    webUSB.send(rml);
  }

  function confirmToolTouching() {
    console.log(state.origin);
    console.log("Tool touching surface confirmed.");
    if (onConfirm) onConfirm();
    closeModal();
  }
}
