const canvas = document.getElementById("drawBoard");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const statusEl = document.getElementById("status");
const predictBtn = document.getElementById("predictBtn");
const clearBtn = document.getElementById("clearBtn");
const predDigitEl = document.getElementById("predDigit");
const predConfidenceEl = document.getElementById("predConfidence");
const barsEl = document.getElementById("bars");

let drawing = false;
let lastPoint = null;
let predictTimer = null;

function initBoard() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 22;
  ctx.strokeStyle = "#ffffff";
}

function resetPredictionView() {
  predDigitEl.textContent = "-";
  predConfidenceEl.textContent = "Confidence: -";
  renderBars(new Array(10).fill(0));
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function renderBars(probabilities) {
  barsEl.innerHTML = "";
  probabilities.forEach((prob, digit) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.textContent = String(digit);

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(0, Math.min(1, prob)) * 100}%`;
    track.appendChild(fill);

    const value = document.createElement("span");
    value.textContent = `${(prob * 100).toFixed(1)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    barsEl.appendChild(row);
  });
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function stroke(from, to) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function schedulePredict() {
  if (predictTimer) clearTimeout(predictTimer);
  predictTimer = setTimeout(() => {
    runPrediction();
  }, 180);
}

function to28x28Pixels() {
  const small = document.createElement("canvas");
  small.width = 28;
  small.height = 28;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.fillStyle = "#000000";
  sctx.fillRect(0, 0, 28, 28);
  sctx.drawImage(canvas, 0, 0, 28, 28);

  const data = sctx.getImageData(0, 0, 28, 28).data;
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
    pixels.push(gray);
  }
  return pixels;
}

async function runPrediction() {
  const pixels = to28x28Pixels();
  const inkAmount = pixels.reduce((sum, v) => sum + v, 0);
  if (inkAmount < 1) {
    setStatus("Draw a larger digit before predicting.", true);
    return;
  }

  setStatus("Predicting...");
  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixels }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Prediction failed.");
    }

    predDigitEl.textContent = String(data.digit);
    predConfidenceEl.textContent = `Confidence: ${(data.confidence * 100).toFixed(2)}%`;
    renderBars(data.probabilities);
    setStatus("Prediction updated.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  drawing = true;
  lastPoint = getPoint(event);
  canvas.setPointerCapture(event.pointerId);
  stroke(lastPoint, lastPoint);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing) return;
  event.preventDefault();
  const point = getPoint(event);
  stroke(lastPoint, point);
  lastPoint = point;
});

canvas.addEventListener("pointerup", (event) => {
  if (!drawing) return;
  event.preventDefault();
  drawing = false;
  lastPoint = null;
  canvas.releasePointerCapture(event.pointerId);
  schedulePredict();
});

canvas.addEventListener("pointerleave", () => {
  drawing = false;
  lastPoint = null;
});

predictBtn.addEventListener("click", runPrediction);
clearBtn.addEventListener("click", () => {
  initBoard();
  resetPredictionView();
  setStatus("Board cleared.");
});

initBoard();
resetPredictionView();
renderBars(new Array(10).fill(0));
