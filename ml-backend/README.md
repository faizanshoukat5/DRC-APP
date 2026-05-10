---
title: DR Classifier
emoji: 🔬
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Diabetic Retinopathy Classifier

FastAPI backend serving an EfficientNet-B4 trained on ~11k fundus images
for 5-class diabetic retinopathy severity grading. Calibrated with
temperature scaling, Grad-CAM heatmap overlays, 4-pass test-time
augmentation, on-demand colormap recoloring.

## Endpoints

- `POST /predict` — multipart form `file` (image) + optional `colormap`.
  Returns class, calibrated probabilities, primary heatmap (PNG b64) and
  pre-rendered Turbo + Inferno variants in `heatmaps_b64`.
- `POST /recolor` — multipart form `file` + `colormap`. Single-pass
  Grad-CAM (no TTA) for on-demand palette switching. ~300 ms.
- `GET /health` — liveness probe.
- `GET /docs` — interactive Swagger UI.

## Auth

Set `DR_API_KEY` env var → callers must send `x-api-key` header.

## Configuration

- `DR_TTA=false` to disable 4-pass test-time augmentation.
- `DR_CORS_ORIGINS` — comma-separated allowlist (default `*`).
