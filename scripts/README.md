# Scripts

Tooling that lives outside the mobile app and ML backend.

## benchmark_models.py

Compares **RetinaPilot v1** (`EXPO_PUBLIC_DR_API_URL`) against the **Partner
Model** (`EXPO_PUBLIC_DR_API_URL_PARTNER`) on a labeled set of fundus images.
Reports top-1 accuracy, per-class precision/recall/F1, confusion matrices,
mean/p95 latency, and Expected Calibration Error (top-1 ECE for both models,
plus full 5-class ECE for RetinaPilot since the partner doesn't return a
distribution).

### Setup

```bash
pip install requests numpy gdown
```

### Run

```bash
python scripts/benchmark_models.py
```

First run downloads the user's labeled fundus images from
[this Drive folder](https://drive.google.com/drive/folders/1cV6Tkqm-pjHWvhZhSWB4P2uN0v9kk7K6?usp=sharing)
into `scripts/benchmark-images/`. Subsequent runs reuse the cache.

### Filename → label

Two schemes work:

1. **`class{N}_<id>.png`** — class index encoded in the filename prefix
   (e.g. `class3_069f43616fab.png` → label 3). Used by `dr-test-images/`.
2. **`<id>.png` + `labels.csv`** — APTOS-style filenames with a CSV mapping
   `image_id` → `label`. Default lookup at `c:\Users\Faizan\Downloads\labels.csv`,
   override with `--labels-csv <path>`.

### Outputs

Each run writes to `scripts/benchmark-results/<YYYYMMDD-HHMMSS>/`:

- `summary.txt` — screenshot-friendly comparison table + per-class metrics + confusion matrices.
- `predictions.csv` — every row, every model: `image, label, model, predicted, confidence, latency_ms, error, probs_json`. Ready for further analysis.

The summary is also printed to stdout when the script finishes.

### Sample output

```
======================================================================
DR Model Comparison — RetinaPilot v1 vs Partner
======================================================================
Test images: 37
Distribution: class 0: 16, class 1: 5, class 2: 9, class 3: 2, class 4: 5
⚠ Small sample size — interpret confidence intervals with caution.

Metric              RetinaPilot v1     Partner Model
------              ---------------    -----------------
Top-1 accuracy      31/37 (83.8%)      28/37 (75.7%)
Macro F1            0.812              0.703
Top-1 ECE           0.058              0.183
Full 5-class ECE    0.041              N/A (no probs)
```

### CLI flags

| Flag | Default | Purpose |
|---|---|---|
| `--images-dir` | `scripts/benchmark-images/` | Local image cache |
| `--drive-url` | the user's shared Drive folder | Source for first-run download |
| `--labels-csv` | `c:\Users\Faizan\Downloads\labels.csv` | Fallback label lookup for non-prefix filenames |
| `--out-dir` | `scripts/benchmark-results/<timestamp>/` | Where to write `summary.txt` + `predictions.csv` |

### Adding more images

Drop more PNGs into `scripts/benchmark-images/` (or your own dir via
`--images-dir`) and re-run. Anything matching `class{N}_*` is auto-labeled;
anything else gets looked up in `labels.csv`. The script is idempotent — every
run writes to a fresh timestamped output dir.

### Notes

- Both backends are called sequentially (~2-3 s per image, ~1.5 min for 37 images). Parallel
  calls risk hitting HF Space concurrency limits.
- If RetinaPilot's image-quality gate rejects an image (`Laplacian var < 5.0`),
  the script logs the failure and excludes that row from RetinaPilot's accuracy
  but keeps the partner's prediction for the same image.
- HF Spaces cold-start on first request after idle (~30-45 s). Latency p95 is
  computed on all calls — first call may dominate. Re-run for cleaner numbers.
- The script mirrors the response normalization in
  [`mobile/src/lib/mlApi.ts`](../mobile/src/lib/mlApi.ts) so results match what
  users see in the app.
