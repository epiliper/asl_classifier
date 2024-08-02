import base64
import io
from typing import List, Dict

import numpy as np
from fastapi import FastAPI, Form, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from mangum import Mangum
from PIL import Image
from PIL.ImageOps import invert
from pydantic import BaseModel
from tflite_runtime.interpreter import Interpreter

# Constants

LABELS = [chr(i) for i in range(ord("a"), ord("y") + 1) if chr(i) != "j"]

# Initialize FastAPI app and TFLite interpreter
app = FastAPI()
handler = Mangum(app)
interpreter = Interpreter("model.tflite")


class Result(BaseModel):
    category: str
    confs: List[Dict[str, float]] = []


def set_input_tensor(interpreter: Interpreter, X: np.ndarray) -> None:
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()[0]
    interpreter.set_tensor(input_details["index"], X)


def predict(interpreter: Interpreter, X: np.ndarray) -> np.ndarray:
    """Predict Image Class"""
    set_input_tensor(interpreter, X)
    interpreter.invoke()
    output_details = interpreter.get_output_details()[0]
    return interpreter.get_tensor(output_details["index"])[0]


def process_image(image: io.BytesIO) -> np.ndarray:
    """Process Image File"""
    with Image.open(image) as img:
        img = img.convert("L")
        pad_color = int(np.argmax(np.bincount(np.array(img).flatten())))
        width, height = img.size
        size = max(width, height)
        square = Image.new(img.mode, (size, size), pad_color)
        square.paste(img, ((size - width) // 2, (size - height) // 2))
        square = square.resize((28, 28))
        square = invert(square)

    X = np.array(square)
    X = (X - X.min()) / (X.max() - X.min())
    return X.reshape(28, 28, 1)


@app.post("/image")
async def post_image(filedata: str = Form(...)):
    """Post Image endpoint"""
    try:
        image_bytes = base64.b64decode(filedata)
        image = io.BytesIO(image_bytes)
        X = process_image(image)

        pred = predict(interpreter, X[np.newaxis, ...])
        category = LABELS[pred.argmax()]

        confs = [
            {"name": LABELS[i], "conf": round(conf * 100, 2)}
            for i, conf in enumerate(pred)
        ]
        confs.sort(key=lambda x: -x["conf"])

        result = Result(category=category, confs=confs)
        return JSONResponse(content=jsonable_encoder(result))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def get_root():
    """Get Root endpoint"""
    return {"message": ["Welcome to ASLClassifier!"]}
