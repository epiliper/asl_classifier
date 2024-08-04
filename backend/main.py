import logging
import json
from pydantic import BaseModel
from tflite_runtime.interpreter import Interpreter
from PIL.ImageOps import invert
from PIL import Image
from mangum import Mangum
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware import Middleware
import numpy as np
from typing import List, Dict
import io
import base64

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Constants
LABELS = [chr(i) for i in range(ord("a"), ord("y") + 1) if chr(i) != "j"]

# Initialize FastAPI app and TFLite interpreter
middleware = Middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app = FastAPI(middleware=middleware)
app = FastAPI()
mangum_handler = Mangum(app)
interpreter = Interpreter("model.tflite")


class Result(BaseModel):
    category: str
    confs: List[Dict] = []


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

    X = np.array(square, dtype=np.float32)
    X = (X - X.min()) / (X.max() - X.min())
    return X.reshape(28, 28, 1)


@app.post("/image")
async def post_image(filedata: str = Form(...)):
    """Post Image endpoint"""
    try:
        logger.info("Received image data")
        image_bytes = base64.b64decode(filedata)
        image = io.BytesIO(image_bytes)
        X = process_image(image)

        pred = predict(interpreter, X[np.newaxis, ...])
        logger.info(f"Raw prediction values: {pred}")

        category = LABELS[pred.argmax()]

        confs = []
        for i, conf in enumerate(pred):
            confs.append(
                {
                    "name": LABELS[i],
                    "conf": round(float(conf) * 100, 2),
                }
            )

        confs.sort(key=lambda x: -x["conf"])

        result = Result(category=category, confs=confs)
        logger.info(f"Prediction result: {result}")
        return JSONResponse(content=jsonable_encoder(result))
    except Exception as e:
        logger.error(f"Error in post_image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def get_root():
    """Get Root endpoint"""
    return {"message": ["Welcome to ASLClassifier!"]}


def handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        response = mangum_handler(event, context)
        logger.info(f"Lambda response: {json.dumps(response)}")

        # Ensure CORS headers are in the response
        if "headers" not in response:
            response["headers"] = {}

        # Set a single Access-Control-Allow-Origin header
        # response["headers"]["Access-Control-Allow-Origin"] = "*"
        response["headers"]["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
        response["headers"]["Access-Control-Allow-Headers"] = "Content-Type"

        # Remove any duplicate headers
        if "multiValueHeaders" in response:
            print("multi value detectedc")
            response["multiValueHeaders"].pop("Access-Control-Allow-Origin", None)

        return response
    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        raise
