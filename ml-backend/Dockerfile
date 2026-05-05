# Dockerfile for Hugging Face Spaces (Docker SDK) or any Docker host
FROM python:3.11-slim

WORKDIR /app

# System libraries OpenCV needs at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

# Python deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code + model + calibration
COPY app.py .
COPY efficientnet_b4_best.pth .
COPY calibration.json .

# Hugging Face Spaces expects port 7860
EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
