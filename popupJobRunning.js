import { html, render } from "./libs/lit-html.js";

export function popupJobRunning(state, time) {
  let isJobRunning = true;
  const startTime = performance.now();
  let intervalId;

  const jobRunningTemplate = () => html`
    <div
      class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div
        class="bg-white p-6 rounded-lg shadow-lg w-80 h-auto relative flex flex-col items-center justify-center"
      >
        <!-- Job Running Message -->
        <div class="text-lg font-semibold mb-2">
          ${isJobRunning ? "Job is running..." : "Job complete."}
        </div>

        <!-- Elapsed time -->
        <div class="text-lg mb-2 flex justify-between w-full">
          <span>Elapsed time:</span>
          <span id="elapsed-time" class="font-mono">00:00:00</span>
        </div>

        <!-- Estimated time -->
        <div class="text-lg mb-2 flex justify-between w-full">
          <span>Estimated time:</span>
          <span class="font-mono">${time}</span>
        </div>

        <!-- Close Button, only shown when job is finished -->
        <button
          class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mt-4"
          @click=${closeModal}
        >
          Click when Completed
        </button>
      </div>
    </div>
  `;

  const modalWrapper = document.createElement("div");
  document.body.appendChild(modalWrapper);

  // Initial render of the modal
  render(jobRunningTemplate(), modalWrapper);

  const elapsedTimeElement = modalWrapper.querySelector("#elapsed-time");

  // Set interval to update elapsed time every second
  intervalId = setInterval(() => {
    const elapsedTimeInSeconds = (performance.now() - startTime) / 1000;
    const elapsedTimeFormatted = toHHMMSS(elapsedTimeInSeconds);
    elapsedTimeElement.innerText = elapsedTimeFormatted;
  }, 1000);

  function closeModal() {
    clearInterval(intervalId); // Stop updating elapsed time
    document.body.removeChild(modalWrapper);
  }
}

function toHHMMSS(sec_num) {
  sec_num = Math.floor(sec_num);
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor((sec_num - hours * 3600) / 60);
  const seconds = sec_num - hours * 3600 - minutes * 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
