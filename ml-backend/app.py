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

import base64
import io
import json
import os
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
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


def _cropped_rgb_for_overlay(img_bgr: np.ndarray, target: int = IMG_SIZE) -> np.ndarray:
    """Original-looking RGB crop used as the heatmap base layer.
    Same fundus crop as the model sees, but WITHOUT the Ben-Graham
    contrast manipulation, so the doctor sees a recognizable retina.
    """
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = _crop_to_fundus(img)
    return cv2.resize(img, (target, target), interpolation=cv2.INTER_AREA)


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


# ─── Grad-CAM helpers ─────────────────────────────────────────────────────
# Hook the final MBConv block of EfficientNet-B4 — that's where the highest-
# level discriminative feature maps live before global pooling. Standard
# Grad-CAM target for this architecture.


def _gradcam_overlay(activations: torch.Tensor,
                     gradients: torch.Tensor,
                     base_rgb: np.ndarray,
                     max_alpha: float = 0.65,
                     attention_threshold: float = 0.35) -> np.ndarray:
    """Grad-CAM overlay tuned for clinical readability.

    - Weight feature maps by spatially-averaged gradients (standard Grad-CAM).
    - ReLU + normalize 0..1.
    - Resize to base image, smooth with a small Gaussian to avoid blocky pixels.
    - Soft-threshold below `attention_threshold` so cool/blue regions don't
      tint the entire fundus — only warm regions are blended.
    - TURBO colormap: perceptually uniform, more modern than JET.
    - Per-pixel alpha = clip((cam - threshold) / (1 - threshold), 0, 1) * max_alpha
      so the strongest attention dominates and weak attention fades to zero.
    """
    # Channel weights = global-average-pool of gradients
    weights = gradients.mean(dim=(2, 3), keepdim=True)         # (1, C, 1, 1)
    cam = (weights * activations).sum(dim=1, keepdim=False)    # (1, H, W)
    cam = F.relu(cam)[0]                                        # (H, W)

    cam_np = cam.detach().cpu().numpy().astype(np.float32)
    cam_min, cam_max = cam_np.min(), cam_np.max()
    if cam_max - cam_min < 1e-6:
        # Model attended uniformly — return the base unchanged rather than
        # painting the whole image one color.
        return base_rgb.copy()

    cam_unit = (cam_np - cam_min) / (cam_max - cam_min)        # (H, W) in [0, 1]

    h_img, w_img = base_rgb.shape[:2]
    cam_resized = cv2.resize(cam_unit, (w_img, h_img), interpolation=cv2.INTER_CUBIC)
    # Smooth so the low-resolution feature map doesn't show as 12x12 blocks
    cam_resized = cv2.GaussianBlur(cam_resized, (0, 0), sigmaX=max(w_img, h_img) / 80)
    cam_resized = np.clip(cam_resized, 0.0, 1.0)

    cam_uint8 = (cam_resized * 255).astype(np.uint8)
    heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_TURBO)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    # Soft threshold: only blend where the model actually attended.
    weight = np.clip(
        (cam_resized - attention_threshold) / (1.0 - attention_threshold),
        0.0, 1.0,
    ) * max_alpha
    weight = weight[..., None]  # (H, W, 1) for broadcasting

    base_f = base_rgb.astype(np.float32)
    blended = base_f * (1.0 - weight) + heatmap_rgb * weight
    return np.clip(blended, 0, 255).astype(np.uint8)


def _encode_png_b64(img_rgb: np.ndarray) -> str:
    """Encode an RGB uint8 image as base64-encoded PNG string."""
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    ok, buf = cv2.imencode(".png", img_bgr)
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


# ─── Core prediction ──────────────────────────────────────────────────────
def predict_bytes(image_bytes: bytes,
                  calibrated: bool = True,
                  with_heatmap: bool = True) -> dict:
    """Run the full pipeline on raw image bytes.

    When `with_heatmap=True` the response includes a base64-encoded PNG
    Grad-CAM overlay under `heatmap_b64`. Costs one extra forward+backward
    pass (~600 ms on CPU).
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("could not decode image (bad format or corrupt file)")

    ok, reason = _is_likely_fundus(img_bgr)
    if not ok:
        raise ValueError(f"image quality check failed: {reason}")

    pre_rgb = _ben_graham(img_bgr)  # (H, W, 3) uint8 RGB after preprocessing
    x = _infer_tf(Image.fromarray(pre_rgb)).unsqueeze(0).to(DEVICE)
    # Original-looking crop (no Ben-Graham contrast surgery) for the heatmap
    # base layer — doctors should see a recognizable retina, not a sci-fi image.
    overlay_base = _cropped_rgb_for_overlay(img_bgr) if with_heatmap else None

    # Hook capture for Grad-CAM. We always run with grad enabled when a
    # heatmap is requested; otherwise we keep the cheap no-grad path.
    if not with_heatmap:
        with torch.no_grad():
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

    # ─── Grad-CAM path: forward with grad, hook activations, autograd.grad ───
    activations: dict[str, torch.Tensor] = {}

    def _fwd_hook(_module, _inp, output):
        activations["value"] = output

    target_layer = _model.features[-1]
    handle = target_layer.register_forward_hook(_fwd_hook)
    try:
        logits = _model(x)
        with torch.no_grad():
            scaled_logits = logits / _CALIB_T if calibrated else logits
            probs = F.softmax(scaled_logits, dim=1).cpu().numpy()[0]
            cls = int(probs.argmax())

        feats = activations["value"]
        # autograd.grad works on intermediate (non-leaf) tensors; .backward
        # would require feats.requires_grad and a manual .retain_grad() call.
        grads = torch.autograd.grad(
            outputs=logits[0, cls],
            inputs=feats,
            retain_graph=False,
            create_graph=False,
        )[0]
    finally:
        handle.remove()

    overlay_rgb = _gradcam_overlay(feats, grads, overlay_base if overlay_base is not None else pre_rgb)
    heatmap_b64 = _encode_png_b64(overlay_rgb)

    return {
        "class_id":         cls,
        "class_name":       CLASS_NAMES[cls],
        "confidence":       float(probs[cls]),
        "probabilities":    {CLASS_NAMES[i]: float(probs[i]) for i in range(5)},
        "calibrated":       calibrated,
        "temperature_used": _CALIB_T if calibrated else 1.0,
        "heatmap_b64":      heatmap_b64,
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
async def predict(
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
