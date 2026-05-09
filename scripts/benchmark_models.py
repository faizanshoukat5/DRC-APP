"""
Benchmark RetinaPilot v1 vs Partner DR model on labeled fundus images.

Posts each test image to both HF Spaces, normalizes responses (matches the
mobile app's predictFundus normalization in mobile/src/lib/mlApi.ts), and
prints a side-by-side comparison plus a CSV of every prediction.

Run from the repo root:

    python scripts/benchmark_models.py

The first run downloads the user's Drive folder via gdown into
scripts/benchmark-images/. Subsequent runs reuse the local cache.
Labels can be encoded two ways:

  1. class{N}_<id>.png  (filename prefix)        - used by dr-test-images/
  2. <id>.png + labels.csv mapping image_id->N   - used by APTOS dump

The script auto-detects which scheme is in play.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Optional

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    import numpy as np
except ImportError:
    print("Missing dependency: pip install numpy", file=sys.stderr)
    sys.exit(1)


# ─── Config ────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IMAGES_DIR = REPO_ROOT / "scripts" / "benchmark-images"
DEFAULT_OUT_DIR = REPO_ROOT / "scripts" / "benchmark-results"
DEFAULT_DRIVE_URL = "https://drive.google.com/drive/folders/1cV6Tkqm-pjHWvhZhSWB4P2uN0v9kk7K6?usp=sharing"
DEFAULT_LABELS_CSV = Path(r"c:\Users\Faizan\Downloads\labels.csv")
ENV_PATH = REPO_ROOT / "mobile" / ".env"

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
NAME_TO_CLASS = {name: i for i, name in enumerate(CLASS_NAMES)}
NAME_TO_CLASS["Proliferative DR"] = 4  # partner returns this variant

REQUEST_TIMEOUT = 60  # generous - HF Space cold starts can be 30-45s


# ─── Env loading ───────────────────────────────────────────────────────────

def load_env(path: Path) -> dict[str, str]:
    """Tiny dotenv parser - avoids adding python-dotenv as a dep."""
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# ─── Drive download ────────────────────────────────────────────────────────

def ensure_images(images_dir: Path, drive_url: str) -> None:
    images_dir.mkdir(parents=True, exist_ok=True)
    has_images = any(
        p.suffix.lower() in (".png", ".jpg", ".jpeg") for p in images_dir.iterdir()
    )
    if has_images:
        return

    print(f"No images found in {images_dir}. Downloading from Drive...")
    try:
        subprocess.run(
            [sys.executable, "-m", "gdown", "--folder", drive_url, "-O", str(images_dir)],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(
            "\nDrive download failed. The folder may not be public, or "
            "you've hit Drive's per-file quota.\n"
            "Fix: Drive → folder → Share → 'Anyone with the link, Viewer'.\n"
            f"Original error: {e}\n",
            file=sys.stderr,
        )
        sys.exit(2)


# ─── Label resolution ──────────────────────────────────────────────────────

CLASS_PREFIX_RE = re.compile(r"^class([0-4])_", re.IGNORECASE)


def resolve_labels(images_dir: Path, labels_csv: Path) -> dict[Path, int]:
    """Return {image_path: class_id}. Uses prefix when filenames look like
    `class{N}_*.png`; falls back to the labels.csv lookup."""
    images = sorted(
        p for p in images_dir.iterdir()
        if p.suffix.lower() in (".png", ".jpg", ".jpeg")
    )
    if not images:
        print(f"No images in {images_dir}.", file=sys.stderr)
        sys.exit(2)

    # Try prefix first
    prefix_labels: dict[Path, int] = {}
    no_prefix: list[Path] = []
    for p in images:
        m = CLASS_PREFIX_RE.match(p.name)
        if m:
            prefix_labels[p] = int(m.group(1))
        else:
            no_prefix.append(p)

    if not no_prefix:
        return prefix_labels

    # Fall back to CSV for the rest
    if not labels_csv.exists():
        print(
            f"\n{len(no_prefix)} image(s) don't match `class{{N}}_*` and no "
            f"labels.csv found at {labels_csv}.\n"
            f"Either rename the files or provide --labels-csv.\n"
            f"First few unmatched: {[p.name for p in no_prefix[:5]]}",
            file=sys.stderr,
        )
        sys.exit(2)

    csv_map: dict[str, int] = {}
    with labels_csv.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_map[row["image_id"]] = int(row["label"])

    out = dict(prefix_labels)
    missing: list[str] = []
    for p in no_prefix:
        if p.name in csv_map:
            out[p] = csv_map[p.name]
        else:
            missing.append(p.name)

    if missing:
        print(
            f"\n{len(missing)} image(s) not found in {labels_csv.name}: "
            f"{missing[:5]}{'...' if len(missing) > 5 else ''}",
            file=sys.stderr,
        )
        sys.exit(2)

    return out


# ─── Backend calls ─────────────────────────────────────────────────────────

class Backend:
    def __init__(self, key: str, label: str, url: str, api_key: Optional[str]) -> None:
        self.key = key
        self.label = label
        self.url = url.rstrip("/")
        self.api_key = api_key

    def predict(self, image_path: Path) -> dict:
        """Return normalized prediction dict, or {'error': msg, 'latency_ms': n}."""
        with image_path.open("rb") as f:
            files = {"file": (image_path.name, f, "image/png")}
            headers = {}
            if self.api_key:
                headers["x-api-key"] = self.api_key

            t0 = time.perf_counter()
            try:
                resp = requests.post(
                    f"{self.url}/predict",
                    files=files,
                    headers=headers,
                    timeout=REQUEST_TIMEOUT,
                )
            except requests.exceptions.RequestException as e:
                return {"error": f"network: {e}", "latency_ms": (time.perf_counter() - t0) * 1000}
            latency_ms = (time.perf_counter() - t0) * 1000

        if not resp.ok:
            try:
                detail = resp.json().get("detail", resp.text[:200])
            except Exception:
                detail = resp.text[:200]
            return {"error": f"http {resp.status_code}: {detail}", "latency_ms": latency_ms}

        try:
            body = resp.json()
        except Exception:
            return {"error": "non-JSON response", "latency_ms": latency_ms}

        # Normalize across backend variants - matches mobile/src/lib/mlApi.ts
        raw_conf = float(body.get("confidence", 0))
        confidence = raw_conf / 100.0 if raw_conf > 1.0 else raw_conf
        class_name_raw = str(body.get("class_name", "")).strip()
        # Strip trailing " DR" so "Proliferative DR" matches "Proliferative"
        normalized_name = re.sub(r"\s+DR$", "", class_name_raw)
        # Use the model's reported class_id when present, fall back to name lookup
        predicted = body.get("class_id")
        if predicted is None and normalized_name in NAME_TO_CLASS:
            predicted = NAME_TO_CLASS[normalized_name]
        elif predicted is None:
            return {"error": f"unknown class_name: {class_name_raw}", "latency_ms": latency_ms}

        # Probabilities - only RetinaPilot returns a 5-element dict
        probs_raw = body.get("probabilities") or {}
        probs: list[float] = []
        if probs_raw:
            for name in CLASS_NAMES:
                # Try both naming conventions
                p = probs_raw.get(name)
                if p is None:
                    p = probs_raw.get(f"{name} DR")
                probs.append(float(p) if p is not None else 0.0)

        return {
            "predicted": int(predicted),
            "predicted_name": class_name_raw,
            "confidence": confidence,
            "probs": probs if len(probs) == 5 else None,
            "latency_ms": latency_ms,
            "calibrated": bool(body.get("calibrated", False)),
            "raw": body,
        }


# ─── Metrics ───────────────────────────────────────────────────────────────

def confusion_matrix(true: list[int], pred: list[int], n_classes: int) -> np.ndarray:
    cm = np.zeros((n_classes, n_classes), dtype=int)
    for t, p in zip(true, pred):
        cm[t, p] += 1
    return cm


def per_class_prf(cm: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    n = cm.shape[0]
    precision = np.zeros(n)
    recall = np.zeros(n)
    f1 = np.zeros(n)
    support = cm.sum(axis=1)
    for c in range(n):
        tp = cm[c, c]
        fp = cm[:, c].sum() - tp
        fn = cm[c, :].sum() - tp
        precision[c] = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall[c] = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        if precision[c] + recall[c] > 0:
            f1[c] = 2 * precision[c] * recall[c] / (precision[c] + recall[c])
    return precision, recall, f1, support


def expected_calibration_error(
    confidences: list[float], correctnesses: list[bool], n_bins: int = 10
) -> float:
    """Top-1 ECE: bin samples by predicted-class confidence, weighted average
    of |bin_avg_confidence - bin_accuracy|."""
    if not confidences:
        return 0.0
    confs = np.array(confidences)
    correct = np.array(correctnesses, dtype=float)
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(confs)
    for i in range(n_bins):
        lo, hi = bins[i], bins[i + 1]
        mask = (confs > lo) & (confs <= hi) if i > 0 else (confs >= lo) & (confs <= hi)
        if mask.sum() == 0:
            continue
        bin_acc = correct[mask].mean()
        bin_conf = confs[mask].mean()
        ece += (mask.sum() / n) * abs(bin_acc - bin_conf)
    return float(ece)


def full_distribution_ece(
    probs_per_sample: list[list[float]], true_labels: list[int], n_bins: int = 10
) -> Optional[float]:
    """ECE on the predicted-class probability (top-1 of the full softmax)."""
    if not probs_per_sample:
        return None
    confs = []
    correct = []
    for probs, label in zip(probs_per_sample, true_labels):
        if probs is None:
            continue
        pred = int(np.argmax(probs))
        confs.append(probs[pred])
        correct.append(pred == label)
    if not confs:
        return None
    return expected_calibration_error(confs, correct, n_bins=n_bins)


# ─── Output ────────────────────────────────────────────────────────────────

def fmt_pct(num: int, denom: int) -> str:
    return f"{num}/{denom} ({100 * num / denom:.1f}%)" if denom > 0 else "-"


def write_summary(out_dir: Path, results: dict, n_images: int, dist: dict[int, int]) -> str:
    lines: list[str] = []
    lines.append("=" * 70)
    lines.append("DR Model Comparison - RetinaPilot v1 vs Partner")
    lines.append("=" * 70)
    lines.append(f"Test images: {n_images}")
    dist_str = ", ".join(f"class {c}: {n}" for c, n in sorted(dist.items()))
    lines.append(f"Distribution: {dist_str}")
    if n_images < 30:
        lines.append("[!] Small sample size - interpret confidence intervals with caution.")
    lines.append("")

    headers = ["Metric"] + [r["label"] for r in results.values()]
    rows: list[list[str]] = []

    def add(metric: str, fmt):
        rows.append([metric] + [fmt(r) for r in results.values()])

    add("Top-1 accuracy", lambda r: fmt_pct(r["correct"], r["valid_n"]))
    add("Macro F1", lambda r: f"{r['macro_f1']:.3f}")
    add("Weighted F1", lambda r: f"{r['weighted_f1']:.3f}")
    add("Mean latency", lambda r: f"{r['mean_latency']:.0f} ms")
    add("p95 latency", lambda r: f"{r['p95_latency']:.0f} ms")
    add("Top-1 ECE", lambda r: f"{r['top1_ece']:.3f}")
    add("Full 5-class ECE", lambda r: f"{r['full_ece']:.3f}" if r["full_ece"] is not None else "N/A (no probs)")
    add("Calibrated softmax", lambda r: "yes" if r["any_calibrated"] else "no")
    add("Failed predictions", lambda r: str(r["failed"]))

    # Render an aligned table
    col_widths = [max(len(row[i]) for row in [headers, *rows]) for i in range(len(headers))]
    sep = "  "
    lines.append(sep.join(h.ljust(w) for h, w in zip(headers, col_widths)))
    lines.append(sep.join("-" * w for w in col_widths))
    for row in rows:
        lines.append(sep.join(c.ljust(w) for c, w in zip(row, col_widths)))

    # Per-model: per-class metrics + confusion matrices
    for r in results.values():
        lines.append("")
        lines.append(f"--- {r['label']} ---")
        lines.append("Per-class precision / recall / F1 / support:")
        lines.append("  " + "Class".ljust(16) + " P     R     F1    Support")
        for c, name in enumerate(CLASS_NAMES):
            lines.append(
                f"  {name:<16} {r['precision'][c]:.2f}  {r['recall'][c]:.2f}  "
                f"{r['f1'][c]:.2f}  {int(r['support'][c])}"
            )
        lines.append("Confusion matrix (rows = true, cols = predicted):")
        cm = r["cm"]
        # Header row with class indices
        lines.append("       " + " ".join(f"{c:>4}" for c in range(5)))
        for true_c in range(5):
            lines.append(f"  {true_c}=>  " + " ".join(f"{cm[true_c, p]:>4}" for p in range(5)))

    text = "\n".join(lines)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "summary.txt").write_text(text, encoding="utf-8")
    return text


def write_predictions_csv(out_dir: Path, all_predictions: list[dict]) -> None:
    out_path = out_dir / "predictions.csv"
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "image", "label", "model", "predicted", "predicted_name",
            "confidence", "latency_ms", "error", "probs_json",
        ])
        for r in all_predictions:
            writer.writerow([
                r["image"], r["label"], r["model"], r.get("predicted", ""),
                r.get("predicted_name", ""), r.get("confidence", ""),
                f"{r['latency_ms']:.1f}", r.get("error", ""),
                json.dumps(r.get("probs")) if r.get("probs") else "",
            ])


# ─── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--images-dir", type=Path, default=DEFAULT_IMAGES_DIR)
    parser.add_argument("--drive-url", type=str, default=DEFAULT_DRIVE_URL)
    parser.add_argument("--labels-csv", type=Path, default=DEFAULT_LABELS_CSV)
    parser.add_argument("--out-dir", type=Path, default=None,
                        help="Default: scripts/benchmark-results/<timestamp>/")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    rp_url = env.get("EXPO_PUBLIC_DR_API_URL")
    rp_key = env.get("EXPO_PUBLIC_DR_API_KEY")
    partner_url = env.get("EXPO_PUBLIC_DR_API_URL_PARTNER")
    if not rp_url or not partner_url:
        print(
            "Missing env vars in mobile/.env. Need EXPO_PUBLIC_DR_API_URL and "
            "EXPO_PUBLIC_DR_API_URL_PARTNER.",
            file=sys.stderr,
        )
        sys.exit(2)

    backends = [
        Backend("rp_v1", "RetinaPilot v1", rp_url, rp_key),
        Backend("partner", "Partner Model", partner_url, None),
    ]

    out_dir = args.out_dir or (DEFAULT_OUT_DIR / time.strftime("%Y%m%d-%H%M%S"))
    print(f"Output directory: {out_dir}")

    ensure_images(args.images_dir, args.drive_url)
    label_map = resolve_labels(args.images_dir, args.labels_csv)
    paths = sorted(label_map.keys())
    print(f"Loaded {len(paths)} images. Class distribution: {dict(Counter(label_map.values()))}")

    all_predictions: list[dict] = []
    per_backend: dict[str, dict] = {b.key: {
        "label": b.label, "true": [], "pred": [],
        "confidences": [], "correctnesses": [],
        "probs_per_sample": [], "latencies": [],
        "any_calibrated": False, "failed": 0,
    } for b in backends}

    for i, path in enumerate(paths, 1):
        label = label_map[path]
        print(f"  [{i:>3}/{len(paths)}] {path.name}  (true={label})", flush=True)
        for backend in backends:
            result = backend.predict(path)
            row = {
                "image": path.name, "label": label, "model": backend.key,
                "latency_ms": result["latency_ms"],
            }
            agg = per_backend[backend.key]
            agg["latencies"].append(result["latency_ms"])
            if "error" in result:
                row["error"] = result["error"]
                agg["failed"] += 1
                print(f"      {backend.key}: ERROR {result['error']}", file=sys.stderr)
            else:
                row.update({
                    "predicted": result["predicted"],
                    "predicted_name": result["predicted_name"],
                    "confidence": result["confidence"],
                    "probs": result["probs"],
                })
                agg["true"].append(label)
                agg["pred"].append(result["predicted"])
                agg["confidences"].append(result["confidence"])
                agg["correctnesses"].append(result["predicted"] == label)
                agg["probs_per_sample"].append(result["probs"])
                if result["calibrated"]:
                    agg["any_calibrated"] = True
                ok_marker = "[OK]" if result["predicted"] == label else "[X]"
                print(
                    f"      {backend.key}: pred={result['predicted']} "
                    f"({result['confidence']*100:.1f}%) {ok_marker} "
                    f"{result['latency_ms']:.0f}ms"
                )
            all_predictions.append(row)

    # Compute final metrics
    results: dict[str, dict] = {}
    for backend in backends:
        agg = per_backend[backend.key]
        valid_n = len(agg["true"])
        cm = confusion_matrix(agg["true"], agg["pred"], 5)
        precision, recall, f1, support = per_class_prf(cm)
        macro_f1 = float(f1.mean())
        weighted_f1 = float((f1 * support).sum() / max(support.sum(), 1))
        latencies = np.array(agg["latencies"])
        results[backend.key] = {
            "label": backend.label,
            "correct": int(sum(agg["correctnesses"])),
            "valid_n": valid_n,
            "cm": cm,
            "precision": precision, "recall": recall, "f1": f1, "support": support,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "mean_latency": float(latencies.mean()) if len(latencies) else 0,
            "p95_latency": float(np.percentile(latencies, 95)) if len(latencies) else 0,
            "top1_ece": expected_calibration_error(agg["confidences"], agg["correctnesses"]),
            "full_ece": full_distribution_ece(agg["probs_per_sample"], agg["true"]),
            "any_calibrated": agg["any_calibrated"],
            "failed": agg["failed"],
        }

    summary = write_summary(out_dir, results, len(paths), dict(Counter(label_map.values())))
    write_predictions_csv(out_dir, all_predictions)

    print()
    print(summary)
    print()
    print(f"Wrote {out_dir}/summary.txt and {out_dir}/predictions.csv")


if __name__ == "__main__":
    main()
