from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    import tensorflow as tf
except Exception:  # pragma: no cover - optional runtime import
    tf = None


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "mnist_cnn.keras"
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="MNIST Digit Recognizer")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class PredictRequest(BaseModel):
    pixels: List[float] = Field(
        ...,
        min_length=28 * 28,
        max_length=28 * 28,
        description="Flattened 28x28 grayscale values in [0, 1].",
    )


class PredictResponse(BaseModel):
    digit: int
    confidence: float
    probabilities: List[float]


@lru_cache(maxsize=1)
def load_model():
    if tf is None:
        raise RuntimeError(
            "TensorFlow is not installed. Install requirements and restart the server."
        )
    if not MODEL_PATH.exists():
        raise RuntimeError(
            "Model file is missing. Train first with `python train.py` in this folder."
        )
    return tf.keras.models.load_model(MODEL_PATH)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health():
    return {"status": "ok", "model_exists": MODEL_PATH.exists()}


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest) -> PredictResponse:
    image = np.asarray(payload.pixels, dtype=np.float32)
    image = np.clip(image, 0.0, 1.0)

    if float(image.sum()) < 1.0:
        raise HTTPException(
            status_code=400,
            detail="No visible digit detected. Draw a larger/brighter digit.",
        )

    try:
        model = load_model()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    probabilities = model.predict(image.reshape(1, 28, 28, 1), verbose=0)[0]
    digit = int(np.argmax(probabilities))

    return PredictResponse(
        digit=digit,
        confidence=float(probabilities[digit]),
        probabilities=probabilities.astype(float).tolist(),
    )
