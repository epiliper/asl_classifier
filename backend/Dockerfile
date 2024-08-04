FROM public.ecr.aws/lambda/python:3.10

COPY main.py ${LAMBDA_TASK_ROOT}
COPY model.tflite ${LAMBDA_TASK_ROOT}

# Install dependencies
## default wheels for tflite-runtime are broken for AWS lambda, so install third-party version
RUN pip install --no-cache-dir https://github.com/alexeygrigorev/tflite-aws-lambda/blob/main/tflite/tflite_runtime-2.14.0-cp310-cp310-linux_x86_64.whl?raw=true

RUN pip install fastapi mangum Pillow python-multipart uvicorn pydantic

RUN pip install numpy==1.23.5;

ENTRYPOINT [ "/lambda-entrypoint.sh" ]
CMD [ "main.handler" ]
