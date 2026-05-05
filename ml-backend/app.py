"""
DR Classifier — FastAPI deployment skeleton
============================================
For when you're ready to put the model behind an HTTP endpoint.

WHAT YOU NEED IN THE SAME FOLDER AS THIS FILE:
  1. efficientnet_b4_best.pth       (from Step 4)
  2. calibration.json               (from Step 6)
  3. app.py                         (this file)

ONE-TIME SETUP:
  pip install fastapi uvicorn python-multipart pillow opencv-python-headless \
              torch torchvision numpy

RUN LOCALLY:
  uvicorn app:app --reload --host 0.0.0.0 --port 8000

THEN HIT IT:
  Open http://localhost:8000/docs  in your browser. FastAPI auto-generates an
  interactive UI where you can upload a fundus image and see the prediction.

  Or curl:
  curl -X POST http://localhost:8000/predict \\
       -F "file=@/path/to/fundus.jpg"
"""

import io
import json
import os
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from torchvision import transforms
from torchvision.models import efficientnet_b4

# ─── Constants ─────────────────────────────────────────────────────────────
HERE          = Path(__file__).parent
MODEL_PATH    = HERE / "efficientnet_b4_best.pth"
CALIB_PATH    = HERE / "calibration.json"
CLASS_NAMES   = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
IMG_SIZE      = 380
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]
DEVICE        = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ─── Model ─────────────────────────────────────────────────────────────────
def build_model() -> nn.Module:
    """Same architecture as Step 4 training."""
    m = efficientnet_b4(weights=None)
    in_features = m.classifier[1].in_features  # 1792
    m.classifier = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, 5),
    )
    return m


# ─── Preprocessing (same Ben Graham pipeline used in training) ────────────
def _crop_to_fundus(img: np.ndarray, tol: int = 7) -> np.ndarray:
    if img.ndim == 2:
        mask = img > tol
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        mask = gray > tol
    if not mask.any():
        return img
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    return img[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]


def _ben_graham(img_bgr: np.ndarray, target: int = IMG_SIZE, sigma_x: int = 10) -> np.ndarray:
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = _crop_to_fundus(img)
    img = cv2.resize(img, (target, target), interpolation=cv2.INTER_AREA)
    blur = cv2.GaussianBlur(img, (0, 0), sigmaX=sigma_x)
    return cv2.addWeighted(img, 4, blur, -4, 128)


# ─── Optional sanity gate: reject blurry / non-fundus uploads ─────────────
# Threshold is configurable via env var so it can be tuned without redeploying
# the app. Real fundus images typically score 10–200; clinical photos with
# low contrast or compression can dip below 20. Default chosen permissively.
_BLUR_THRESHOLD = float(os.environ.get("DR_BLUR_THRESHOLD", "5.0"))


def _is_likely_fundus(img_bgr: np.ndarray, blur_threshold: float = _BLUR_THRESHOLD) -> tuple[bool, str]:
    """Cheap quality check using Laplacian variance on the green channel.
    Fundus images have a sharp vessel structure -> high Laplacian variance.
    Returns (ok, reason)."""
    if img_bgr is None or img_bgr.size == 0:
        return False, "empty image"
    if img_bgr.ndim != 3 or img_bgr.shape[2] != 3:
        return False, "not a 3-channel color image"
    green = img_bgr[:, :, 1]
    var = cv2.Laplacian(green, cv2.CV_64F).var()
    if var < blur_threshold:
        return False, f"image looks too blurry (Laplacian var={var:.1f})"
    return True, "ok"


# ─── Load model + calibration ONCE at startup ─────────────────────────────
print("Loading model...")
_model = build_model()
_state = torch.load(MODEL_PATH, map_location=DEVICE)
if isinstance(_state, dict) and "model_state_dict" in _state:
    _state = _state["model_state_dict"]
_model.load_state_dict(_state)
_model = _model.to(DEVICE).eval()

with open(CALIB_PATH) as f:
    _CALIB_T = float(json.load(f)["temperature"])
print(f"Calibration temperature T = {_CALIB_T:.4f}")

_infer_tf = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])


# ─── Core prediction ──────────────────────────────────────────────────────
@torch.no_grad()
def predict_bytes(image_bytes: bytes, calibrated: bool = True) -> dict:
    """Run the full pipeline on raw image bytes."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("could not decode image (bad format or corrupt file)")

    ok, reason = _is_likely_fundus(img_bgr)
    if not ok:
        raise ValueError(f"image quality check failed: {reason}")

    pre = _ben_graham(img_bgr)
    x = _infer_tf(Image.fromarray(pre)).unsqueeze(0).to(DEVICE)
    logits = _model(x)
    if calibrated:
        logits = logits / _CALIB_T
    probs = F.softmax(logits, dim=1).cpu().numpy()[0]
    cls = int(probs.argmax())
    return {
        "class_id":         cls,
        "class_name":       CLASS_NAMES[cls],
        "confidence":       float(probs[cls]),
        "probabilities":    {CLASS_NAMES[i]: float(probs[i]) for i in range(5)},
        "calibrated":       calibrated,
        "temperature_used": _CALIB_T if calibrated else 1.0,
    }


# ─── Optional shared-secret guard ─────────────────────────────────────────
_API_KEY = os.environ.get("DR_API_KEY")


def _check_key(x_api_key: str | None = Header(default=None)) -> None:
    if _API_KEY and x_api_key != _API_KEY:
        raise HTTPException(status_code=401, detail="invalid api key")


# ─── FastAPI app ──────────────────────────────────────────────────────────
app = FastAPI(
    title="Diabetic Retinopathy Classifier",
    version="1.0",
    description="EfficientNet-B4 trained on 11k fundus images. Returns calibrated probabilities.",
)

# CORS: comma-separated allowlist via DR_CORS_ORIGINS env var.
# Default is "*" so local dev keeps working out of the box, but production
# deployments should set this to specific origins (e.g. the web app's domain).
# Mobile apps don't enforce CORS, so this only affects browser-based callers.
_CORS_ORIGINS = [
    o.strip() for o in os.environ.get("DR_CORS_ORIGINS", "*").split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Rate limiting: default 20 req/min per IP. Override with DR_RATE_LIMIT
# (slowapi syntax, e.g. "10/minute"). Prevents drive-by abuse on a public Space.
_RATE_LIMIT = os.environ.get("DR_RATE_LIMIT", "20/minute")
limiter = Limiter(key_func=get_remote_address, default_limits=[_RATE_LIMIT])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/")
def root():
    return {
        "service":     "DR Classifier",
        "model":       "EfficientNet-B4",
        "classes":     CLASS_NAMES,
        "calibration": _CALIB_T,
        "endpoints":   ["/predict (POST)", "/health (GET)", "/docs (interactive UI)"],
    }


@app.get("/health")
def health():
    return {"status": "ok", "device": str(DEVICE), "temperature": _CALIB_T}


@app.post("/predict")
@limiter.limit(_RATE_LIMIT)
async def predict(
    request: Request,
    file: UploadFile = File(...),
    _: None = Depends(_check_key),
):
    """Upload a fundus image, get a DR severity prediction with calibrated confidence."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="upload must be an image")
    try:
        data = await file.read()
        result = predict_bytes(data, calibrated=True)
        result["filename"] = file.filename
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"internal error: {type(e).__name__}: {e}")


# Run with: uvicorn app:app --reload
