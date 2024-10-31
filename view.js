import { html } from "./libs/lit-html.js";
import { renderToolControls } from "./renderToolControls.js";
import { setPresets } from "./setPresets.js";

export function view(state) {
  return html`
    ${renderTopBar(state)}

    <!-- Main Layout -->
    <div class="flex h-[calc(100%-3rem)]">
      ${renderLeftPanel(state)}

      <!-- Center Canvas Area -->
      <div class="flex-grow relative bg-slate-100">
        <canvas id="canvas" class="l-0 t-0 absolute w-full h-full"></canvas>
        <svg canvas-cover class="l-0 t-0 absolute w-full h-full">
          <g
            transform="translate(${STATE.getTransform()
              .x}, ${STATE.getTransform().y}) scale(${STATE.getTransform()
              .scale})"
          >
            <circle
              draggable-toolhead
              r=${8 / STATE.getTransform().scale}
              cx=${STATE.toolheadPos[0]}
              cy=${-STATE.toolheadPos[1]}
              fill="orange"
              opacity="0"
            />
          </g>
        </svg>
      </div>

      <!-- Right Panel with Scroll -->
      <div class="w-[300px] bg-slate-300 p-3 overflow-y-auto">
        ${renderToolControls(state)}
      </div>
    </div>
  `;
}

function renderTopBar(state) {
  return html`
    <!-- Top Bar -->
    <div
      class="w-full h-12 bg-gray-800 text-white flex items-center justify-between px-4"
    >
      <h1 class="text-lg">BitRunner</h1>
      <div class="flex items-center gap-4">
        <a
          href="https://github.com/leomcelroy/bitrunner"
          target="_blank"
          class="text-blue-400 hover:underline hover:text-blue-300 text-sm"
        >
          GitHub
        </a>
        <button connect-btn class="bg-blue-500 px-3 py-1 rounded-md text-sm">
          ${state?.webUSB?.isConnected
            ? "Disconnect from Machine"
            : "Connect to Machine"}
        </button>
      </div>
    </div>
  `;
}

function renderLeftPanel(state) {
  return html`
    <!-- Left Panel with Scroll -->
    <div
      class="w-[300px] bg-white border border-gray-300 rounded-lg p-3 overflow-y-auto flex flex-col gap-2"
    >
      ${renderImagePreview(state)}

      <!-- Preset Menu with Hoverable Dropdown -->
      <div class="relative group w-full">
        <!-- Main Button -->
        <button
          class="bg-white text-gray-700 text-sm py-2 px-4 border border-gray-300 rounded-md w-full text-left"
        >
          Preset Options
        </button>

        <!-- Dropdown Menu (appears on hover) -->
        <div
          class="absolute hidden group-hover:block bg-white shadow-lg border border-gray-300 rounded-lg w-64 z-10"
        >
          <button
            @click=${(e) => {
              setPresets("circuit-traces-1-64");
            }}
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Circuit Traces (1/64 in)
          </button>
          <button
            @click=${(e) => {
              setPresets("circuit-traces-engraving");
            }}
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Circuit Traces (Engraving)
          </button>
          <button
            @click=${(e) => {
              setPresets("circuit-outline-1-32");
            }}
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Circuit Outline (1/32 in)
          </button>
          <button
            @click=${(e) => {
              setPresets("mold-roughing-1-8");
            }}
            class="hidden w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Mold Roughing (1/8 in)
          </button>
          <button
            @click=${(e) => {
              setPresets("mold-finishing-1-8");
            }}
            class="hidden w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Mold Finishing (1/8 in)
          </button>
        </div>
      </div>

      <!-- Toolpath Dropdown -->
      <div class="flex items-center pb-2">
        <label class="w-3/5 text-sm text-gray-700 font-bold"
          >Toolpath Type:</label
        >
        <select
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          @input=${(e) => {
            state.toolpathType = e.target.value;
          }}
        >
          <option value="" ?selected=${state.toolpathType === ""}>None</option>
          <option value="2D" ?selected=${state.toolpathType === "2D"}>
            2D Raster
          </option>
          <option
            class="hidden"
            value="2.5D"
            ?selected=${state.toolpathType === "2.5D"}
          >
            2.5D Raster
          </option>
          <option
            class="hidden"
            value="3D"
            ?selected=${state.toolpathType === "3D"}
          >
            3D Raster
          </option>
        </select>
      </div>

      <!--  -->
      ${renderMillRaster2DParams(state.toolpathType === "2D")}
      <!--  -->
      ${renderMillRaster2_5DParams(state.toolpathType === "2.5D")}
      <!--  -->
      ${renderMillRaster3DParams(state.toolpathType === "3D")}

      <!-- Start Job Button -->
      <button
        generate-toolpath
        ?disabled=${state.toolpathType === "" || state.imgs.length === 0}
        class="text-white px-4 py-2 mt-4 rounded-md w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Generate Toolpath
      </button>

      ${state.isGenerating
        ? html`
            <div class="flex items-center space-x-2">
              <svg
                class="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <div>Generating toolpath...</div>
            </div>
          `
        : ""}
    </div>
  `;
}

function renderImagePreview(state) {
  const imgs = state.imgs;
  const imageSrc = imgs.length > 0 ? imgs[0].img.src : null;

  return html`
    <!-- Preview Image Box -->
    <div
      class="w-full h-32 bg-gray-200 flex items-center justify-center rounded-md"
    >
      ${imageSrc !== null
        ? html`
            <img
              id="preview-image"
              src=${imageSrc}
              alt="Preview"
              class="max-w-full max-h-full object-contain"
            />
          `
        : html`
            <span class="text-gray-500 text-sm text-center">
              Please upload an image by dropping it onto the page.
            </span>
          `}
    </div>
  `;
}

// Function to render Mill Raster 2D parameters
function renderMillRaster2DParams(show) {
  if (!show) return "";
  return html`
    <div class="flex gap-2 flex-col">
      <!-- Threshold Slider Option -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm"> Threshold: </label>
        <!-- Output value next to slider -->
        <span id="threshold-value" class="mr-4 text-sm text-gray-700">
          .5
        </span>
        <!-- Slider -->
        <input
          data-param
          data-key="thresholdValue"
          data-type="number"
          type="range"
          min="0"
          max="1"
          value=".5"
          step="0.1"
          class="w-[50%] w-3/5 h-2 bg-gray-200 rounded-md appearance-none cursor-pointer"
          @input=${(e) => {
            e.target.previousElementSibling.textContent = e.target.value;
          }}
        />
      </div>

      <!-- Tool Diameter -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Tool Diameter (mm):</label>
        <input
          data-param
          data-key="diameter"
          data-type="number"
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.39624"
        />
      </div>

      <!-- Cut Depth -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Cut Depth (mm):</label>
        <input
          data-param
          data-key="cutDepth"
          data-type="number"
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.1016"
        />
      </div>

      <!-- Max Depth -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Max Depth (mm):</label>
        <input
          data-param
          data-key="maxDepth"
          data-type="number"
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.1016"
        />
      </div>

      <!-- Offset Number -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Offset Number:</label>
        <input
          data-param
          data-key="offsetNumber"
          data-type="number"
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="4"
        />
      </div>

      <!-- Offset Stepover -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Offset Stepover:</label>
        <input
          data-param
          data-key="stepover"
          data-type="number"
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.5"
        />
      </div>

      <!-- Direction -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Direction:</label>
        <select
          data-param
          data-key="direction"
          data-type="string"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="climb">Climb</option>
          <option value="conventional">Conventional</option>
        </select>
      </div>

      <!-- Path Merge -->
      <div class="hidden flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Path Merge:</label>
        <input
          data-param
          data-key="pathMerge"
          data-type="number"
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="1"
        />
      </div>

      <!-- Path Order -->
      <div class="hidden flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Path Order:</label>
        <select
          data-param
          data-key="pathOrder"
          data-type="string"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="forward">Forward</option>
          <option value="reverse">Reverse</option>
        </select>
      </div>

      <!-- Sort Distance -->
      <div class="hidden flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Sort Distance:</label>
        <input
          data-param
          data-key="sortDistance"
          data-type="checkbox"
          type="checkbox"
          checked
          class="h-4 w-4 text-blue-500"
        />
      </div>

      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Speed (mm/sec):</label>
        <input
          data-param
          data-key="speed"
          data-type="number"
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="4"
        />
      </div>
    </div>
  `;
}

function renderMillRaster2_5DParams(show) {
  if (!show) return "";
  return html`
    <div class="flex gap-2 flex-col">
      <!-- Tool Diameter -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Tool Diameter (mm):</label>
        <input
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.39624"
        />
      </div>

      <!-- Cut Depth -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Cut Depth (mm):</label>
        <input
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.1016"
        />
      </div>

      <!-- Max Depth -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Max Depth (mm):</label>
        <input
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.1016"
        />
      </div>

      <!-- Offset Number -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Offset Number:</label>
        <input
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="4"
        />
      </div>

      <!-- Offset Stepover -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Offset Stepover:</label>
        <input
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="0.5"
        />
      </div>

      <!-- Direction -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Direction:</label>
        <select class="w-2/5 p-1 border border-gray-300 rounded-md text-sm">
          <option value="climb">Climb</option>
          <option value="conventional">Conventional</option>
        </select>
      </div>

      <!-- Path Merge -->
      <div class="hidden flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Path Merge:</label>
        <input
          type="number"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
          value="1"
        />
      </div>

      <!-- Path Order -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Path Order:</label>
        <select class="w-2/5 p-1 border border-gray-300 rounded-md text-sm">
          <option value="forward">Forward</option>
          <option value="reverse">Reverse</option>
        </select>
      </div>

      <!-- Sort Distance -->
      <div class="flex items-center">
        <label class="w-3/5 text-gray-700 text-sm">Sort Distance:</label>
        <input type="checkbox" checked class="h-4 w-4 text-blue-500" />
      </div>
    </div>
  `;
}

// Function to render Mill Raster 3D parameters
function renderMillRaster3DParams(show) {
  if (!show) return "";

  return html`
    <div class="flex gap-2 flex-col">
      <div class="flex items-center">
        <label class="w-3/5 text-sm text-gray-700">Tool Diameter (mm):</label>
        <input
          type="number"
          value="3.175"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div class="flex items-center">
        <label class="w-3/5 text-sm text-gray-700">Stepover (0-1):</label>
        <input
          type="number"
          value="0.5"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div class="hidden flex items-center">
        <label class="w-3/5 text-sm text-gray-700">Tool Shape:</label>
        <div class="w-2/5 flex items-center gap-1">
          <input
            type="radio"
            id="flat-end"
            name="tool-shape"
            class="h-4 w-4"
            checked
          />
          <label for="flat-end" class="text-sm text-gray-700">Flat End</label>
        </div>
      </div>

      <div class="flex items-center">
        <label class="w-3/5 text-sm text-gray-700">XZ Direction:</label>
        <div class="w-2/5 flex items-center gap-1">
          <input type="checkbox" class="h-4 w-4" checked />
        </div>
      </div>

      <div class="flex items-center">
        <label class="w-3/5 text-sm text-gray-700">YZ Direction:</label>
        <div class="w-2/5 flex items-center gap-1">
          <input type="checkbox" class="h-4 w-4" checked />
        </div>
      </div>

      <div class="flex items-center">
        <label class="w-3/5 text-sm text-gray-700">Vector Fit:</label>
        <input
          type="number"
          value="0.001"
          class="w-2/5 p-1 border border-gray-300 rounded-md text-sm"
        />
      </div>
    </div>
  `;
}
