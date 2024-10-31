export function drawCanvas(state) {
  const {
    canvas,
    ctx,
    imgs,
    pxToMM,
    toolheadPos,
    bedSize,
    getTransform,
    origin,
    toolpath,
  } = state;
  const { x, y, scale } = getTransform();

  const [toolX, toolY] = toolheadPos;
  const [oX, oY] = origin;

  const crosshairsSize = 10 / scale;

  // Disable image smoothing for pixel-perfect drawing
  // ctx.imageSmoothingEnabled = false;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Save the current transformation state
  ctx.save();

  // Apply the transformation for zoom and panning
  ctx.translate(x, y);
  ctx.scale(scale, -scale);

  const [bedX, bedY] = bedSize;

  // Draw the bed to scale (gray rectangle)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(bedX, 0);
  ctx.lineTo(bedX, bedY);
  ctx.lineTo(0, bedY);
  ctx.closePath();
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = "grey";
  ctx.stroke();

  // -- draw images onto canvas --
  if (imgs.length !== 0) {
    const img = imgs[0].img;
    const imgHeight = img.height;
    ctx.save();
    ctx.translate(oX, oY + imgHeight * pxToMM);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, 0, 0, img.width * pxToMM, img.height * pxToMM);
    ctx.restore();
  }

  if (toolpath) {
    ctx.save();
    ctx.lineWidth = 1 / scale;

    toolpath.vectors.forEach((path, pathIndex) => {
      // Draw each path in blue
      ctx.strokeStyle = "blue";
      ctx.beginPath();

      path.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x * pxToMM, y * pxToMM);
        else ctx.lineTo(x * pxToMM, y * pxToMM);
      });
      ctx.stroke();

      // Draw arrows indicating direction
      path.forEach(([x, y], i, arr) => {
        if (i === arr.length - 1) {
          const [prevX, prevY] = path[i - 1];
          drawArrow(
            ctx,
            prevX * pxToMM,
            prevY * pxToMM,
            x * pxToMM,
            y * pxToMM,
            scale,
          );
        }
      });

      // If there's a next path, draw the travel path (red) between paths
      // if (toolpath.vectors[pathIndex + 1]) {
      //   const [lastX, lastY] = path[path.length - 1];
      //   const [nextX, nextY] = toolpath.vectors[pathIndex + 1][0];

      //   ctx.strokeStyle = "red";
      //   ctx.beginPath();
      //   ctx.moveTo(lastX * pxToMM, lastY * pxToMM);
      //   ctx.lineTo(nextX * pxToMM, nextY * pxToMM);
      //   ctx.stroke();
      // }
    });

    ctx.restore();
  }

  // -- draw pointer --
  ctx.lineWidth = 1 / scale;
  ctx.strokeStyle = "red";

  ctx.beginPath();
  ctx.ellipse(toolX, toolY, crosshairsSize, crosshairsSize, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toolX - crosshairsSize, toolY);
  ctx.lineTo(toolX + crosshairsSize, toolY);
  ctx.moveTo(toolX, toolY - crosshairsSize);
  ctx.lineTo(toolX, toolY + crosshairsSize);
  ctx.stroke();

  ctx.restore();
}

function redrawCanvas() {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(pointX, pointY);
  ctx.scale(scale, scale);
  drawFunction(ctx); // Redraw the content
  ctx.restore();
}

function drawArrow(ctx, fromX, fromY, toX, toY, scale) {
  const arrowLength = 6 / scale; // Adjust size of arrows
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.strokeStyle = "blue";
  ctx.fillStyle = "blue";
  ctx.lineWidth = 1 / scale;

  // Draw the main line for the arrow
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Draw the arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowLength * Math.cos(angle - Math.PI / 6),
    toY - arrowLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - arrowLength * Math.cos(angle + Math.PI / 6),
    toY - arrowLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.lineTo(toX, toY);
  ctx.fill();

  ctx.restore();
}
