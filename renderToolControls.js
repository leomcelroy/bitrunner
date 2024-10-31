import { html } from "./libs/lit-html.js";

export function renderToolControls(state) {
  return html`
    <!-- Modal in the top-right corner -->
    <div class="p-2">
      <h3 class="font-semibold text-gray-700 mb-2">Tool Controls</h3>

      <!-- Tool Movement Buttons -->
      <div class="flex justify-around mb-4">
        <!-- Left Control Group with a 3x3 Grid -->
        <div class="grid grid-cols-3 grid-rows-3 gap-2">
          <div></div>
          <!-- Empty Cell -->
          <button
            class="bg-gray-200 hover:bg-gray-300 hover:border-gray-700 border-2 w-10 h-10 rounded"
            data-direction="up"
            @click=${() => moveTool("+y", state)}
          >
            +y
          </button>
          <div></div>
          <!-- Empty Cell -->
          <button
            class="bg-gray-200 hover:bg-gray-300 hover:border-gray-700 border-2 w-10 h-10 rounded"
            data-direction="left"
            @click=${() => moveTool("-x", state)}
          >
            -x
          </button>
          <div></div>
          <!-- Empty Cell in the middle -->
          <button
            class="bg-gray-200 hover:bg-gray-300 hover:border-gray-700 border-2 w-10 h-10 rounded"
            data-direction="right"
            @click=${() => moveTool("+x", state)}
          >
            +x
          </button>
          <div></div>
          <!-- Empty Cell -->
          <button
            class="bg-gray-200 hover:bg-gray-300 hover:border-gray-700 border-2 w-10 h-10 rounded"
            data-direction="down"
            @click=${() => moveTool("-y", state)}
          >
            -y
          </button>
          <div></div>
          <!-- Empty Cell -->
        </div>

        <!-- Right Control Group -->
        <div class="flex flex-col items-center">
          <button
            class="bg-gray-200 hover:bg-gray-300 hover:border-gray-700 border-2 w-10 h-10 rounded"
            data-direction="up"
            @click=${() => moveTool("+z", state)}
          >
            +z
          </button>
          <div class="h-14"></div>
          <button
            class="bg-gray-200 hover:bg-gray-300 hover:border-gray-700 border-2 w-10 h-10 rounded"
            data-direction="down"
            @click=${() => moveTool("-z", state)}
          >
            -z
          </button>
        </div>
      </div>

      <!-- Step Size Input -->
      <div class="flex items-center mb-4 justify-between">
        <label for="stepSize" class="mr-2">Stepsize (mm):</label>
        <input
          id="stepSize1"
          type="number"
          value="1"
          min="0.1"
          step="0.1"
          class="border border-gray-400 p-1 rounded w-20"
        />
      </div>

      <h3 class="font-semibold text-gray-700 mb-2">Pointer Position</h3>

      <!-- Input Fields for X, Y, Z -->
      <div class="flex flex-col gap-2 mb-4">
        <div class="flex items-center">
          <label for="inputX" class="w-10 text-gray-600">X:</label>
          <input
            type="number"
            .value=${state.toolheadPos[0]}
            @input=${(e) => {
              state.toolheadPos[0] = Number(e.target.value);
              renderApp();
            }}
            class="border border-gray-300 rounded px-2 py-1 w-full"
            placeholder="Enter X"
          />
        </div>
        <div class="flex items-center">
          <label for="inputY" class="w-10 text-gray-600">Y:</label>
          <input
            type="number"
            .value=${state.toolheadPos[1]}
            @input=${(e) => {
              state.toolheadPos[1] = Number(e.target.value);
              renderApp();
            }}
            class="border border-gray-300 rounded px-2 py-1 w-full"
            placeholder="Enter Y"
          />
        </div>
        <div class="flex items-center">
          <label for="inputZ" class="w-10 text-gray-600">Z:</label>
          <input
            type="number"
            .value=${state.toolheadPos[2]}
            @input=${(e) => {
              state.toolheadPos[2] = Number(e.target.value);
              renderApp();
            }}
            class="border border-gray-300 rounded px-2 py-1 w-full"
            placeholder="Enter Z"
          />
        </div>
      </div>

      <!-- Control Buttons -->
      <div class="flex flex-col gap-2">
        <button
          move-tool-btn
          class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Move Tool to Pointer
        </button>
        <button
          @click=${(e) => {
            state.origin = [...state.toolheadPos];
          }}
          class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Move Job to Pointer
        </button>
        <button
          start-cut-btn
          ?disabled=${state.toolpath === null}
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Start Cut
        </button>
      </div>
    </div>
  `;
}

function moveTool(direction, state) {
  const stepSize = parseFloat(document.getElementById("stepSize1").value);
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
