import { createListener } from "./createListener.js";

function upload(files, onDrop = null) {
  let file = files[0];

  var reader = new FileReader();

  if (file.type.match("image.*")) {
    reader.onload = (e) => {
      const srcUrl = e.target.result; // This is the srcUrl

      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (onDrop) onDrop({ type: "img", data: imageData, img });
      };
      img.src = srcUrl;
    };
    reader.readAsDataURL(file);
  } else {
    reader.readAsText(file);

    reader.onloadend = (event) => {
      let text = reader.result;
      if (onDrop) onDrop({ type: "text", data: text });
    };
  }
}

export function addDropUpload(el, onDrop) {
  const listener = createListener(el);

  const dropScreen = document.createElement("div");
  dropScreen.className =
    "data-[hidden]:hidden fixed top-0 left-0 w-full h-full bg-gray-700 bg-opacity-50 flex items-center justify-center";
  dropScreen.innerHTML = `
    <h2 class="text-2xl text-white">Drop your ".png" files here!</h2>
  `;
  dropScreen.setAttribute("data-hidden", "");

  el.appendChild(dropScreen);

  listener("drop", "", function (evt) {
    let dt = evt.dataTransfer;
    let files = dt.files;

    dropScreen.setAttribute("data-hidden", "");

    upload(files, onDrop);

    pauseEvent(evt);
  });

  let timer = null;

  listener("dragover", "", function (evt) {
    dropScreen.removeAttribute("data-hidden");
    pauseEvent(evt);
  });

  listener("dragleave", "", (e) => {
    // dropScreen.setAttribute("data-hidden", "");
  });

  listener("mouseleave, mouseout", "", function (evt) {
    // dropScreen.setAttribute("data-hidden", "");
  });
}

function pauseEvent(e) {
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}
