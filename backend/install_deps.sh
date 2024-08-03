#!/bin/bash

pip install --extra-index-url https://google-coral.github.io/py-repo/ tflite_runtime \
	--target=deps

pip install fastapi pydantic mangum Pillow python-multipart uvicorn \
	--target=deps


pip install numpy==2.0.0 --target=deps
