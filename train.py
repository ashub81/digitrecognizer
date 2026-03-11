from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf


def build_model() -> tf.keras.Model:
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(28, 28, 1)),
            tf.keras.layers.Conv2D(32, kernel_size=(3, 3), activation="relu"),
            tf.keras.layers.Conv2D(64, kernel_size=(3, 3), activation="relu"),
            tf.keras.layers.MaxPooling2D(pool_size=(2, 2)),
            tf.keras.layers.Dropout(0.25),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(512, activation="relu"),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(10, activation="softmax"),
        ]
    )
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def train(epochs: int, batch_size: int, model_path: Path) -> None:
    tf.random.set_seed(42)
    np.random.seed(42)

    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
    x_train = (x_train.astype("float32") / 255.0)[..., np.newaxis]
    x_test = (x_test.astype("float32") / 255.0)[..., np.newaxis]

    model = build_model()
    model.summary()

    model.fit(
        x_train,
        y_train,
        batch_size=batch_size,
        epochs=epochs,
        validation_split=0.1,
        verbose=2,
    )

    loss, accuracy = model.evaluate(x_test, y_test, verbose=0)
    print(f"Test loss: {loss:.4f}")
    print(f"Test accuracy: {accuracy:.4f}")

    model_path.parent.mkdir(parents=True, exist_ok=True)
    model.save(model_path)
    print(f"Model saved at: {model_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train MNIST CNN.")
    parser.add_argument("--epochs", type=int, default=5, help="Training epochs.")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size.")
    parser.add_argument(
        "--model-path",
        type=Path,
        default=Path("models/mnist_cnn.keras"),
        help="Where to save the trained model.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(args.epochs, args.batch_size, args.model_path)
