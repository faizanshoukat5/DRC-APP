"""
Render a polished one-page PNG summarizing RetinaPilot v1's performance
on the latest benchmark run. Reads the most recent predictions.csv from
scripts/benchmark-results/ and writes metrics_<timestamp>.png next to it.

Usage:
    python scripts/render_metrics.py                     # latest run, RetinaPilot v1
    python scripts/render_metrics.py --model partner     # partner model instead
    python scripts/render_metrics.py --run-dir <path>    # specific run
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Optional

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib.gridspec import GridSpec

REPO_ROOT = Path(__file__).resolve().parent.parent
RESULTS_ROOT = REPO_ROOT / "scripts" / "benchmark-results"

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]

MODEL_LABELS = {
    "rp_v1": ("RetinaPilot v1", "Calibrated EfficientNet-B4 + Ben-Graham + TTA"),
    "partner": ("Partner Model", "EfficientNet-B4 + Median + Gamma"),
}

# Brand-aligned palette
PRIMARY = "#0ea5e9"
NAVY = "#0f172a"
SLATE_400 = "#94a3b8"
SLATE_600 = "#475569"
SLATE_50 = "#f8fafc"
EMERALD = "#10b981"
AMBER = "#d97706"
ROSE = "#e11d48"
BG = "#ffffff"


def latest_run_dir() -> Path:
    runs = sorted(p for p in RESULTS_ROOT.iterdir() if p.is_dir())
    if not runs:
        raise SystemExit(f"No benchmark runs found in {RESULTS_ROOT}")
    return runs[-1]


def load_predictions(run_dir: Path, model_key: str) -> list[dict]:
    csv_path = run_dir / "predictions.csv"
    if not csv_path.exists():
        raise SystemExit(f"predictions.csv not found in {run_dir}")
    rows: list[dict] = []
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["model"] != model_key:
                continue
            if not row.get("predicted") or row["predicted"] == "":
                # Skip rows that errored out
                continue
            rows.append({
                "image": row["image"],
                "label": int(row["label"]),
                "predicted": int(row["predicted"]),
                "confidence": float(row["confidence"]),
                "latency_ms": float(row["latency_ms"]),
                "probs": json.loads(row["probs_json"]) if row.get("probs_json") else None,
            })
    return rows


def confusion_matrix(rows: list[dict]) -> np.ndarray:
    cm = np.zeros((5, 5), dtype=int)
    for r in rows:
        cm[r["label"], r["predicted"]] += 1
    return cm


def per_class_prf(cm: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    n = cm.shape[0]
    p = np.zeros(n)
    r = np.zeros(n)
    f1 = np.zeros(n)
    sup = cm.sum(axis=1)
    for c in range(n):
        tp = cm[c, c]
        fp = cm[:, c].sum() - tp
        fn = cm[c, :].sum() - tp
        p[c] = tp / (tp + fp) if (tp + fp) else 0
        r[c] = tp / (tp + fn) if (tp + fn) else 0
        f1[c] = 2 * p[c] * r[c] / (p[c] + r[c]) if (p[c] + r[c]) else 0
    return p, r, f1, sup


def expected_calibration_error(confs: np.ndarray, correct: np.ndarray, n_bins: int = 10) -> float:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    n = len(confs)
    if n == 0:
        return 0.0
    ece = 0.0
    for i in range(n_bins):
        lo, hi = bins[i], bins[i + 1]
        mask = (confs > lo) & (confs <= hi) if i > 0 else (confs >= lo) & (confs <= hi)
        if mask.sum() == 0:
            continue
        ece += (mask.sum() / n) * abs(correct[mask].mean() - confs[mask].mean())
    return float(ece)


# ─── Drawing helpers ────────────────────────────────────────────────────


def kpi_tile(ax, value: str, label: str, color: str = PRIMARY) -> None:
    ax.set_axis_off()
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    bbox = FancyBboxPatch(
        (0.02, 0.05), 0.96, 0.9,
        boxstyle="round,pad=0.02,rounding_size=0.06",
        linewidth=0,
        facecolor=SLATE_50,
        transform=ax.transAxes,
    )
    ax.add_patch(bbox)
    ax.text(0.5, 0.62, value, ha="center", va="center",
            fontsize=22, fontweight="bold", color=color, transform=ax.transAxes)
    ax.text(0.5, 0.27, label, ha="center", va="center",
            fontsize=10, color=SLATE_600, transform=ax.transAxes)


def draw_confusion_matrix(ax, cm: np.ndarray, class_names: list[str]) -> None:
    n = len(class_names)
    # Normalize per-row for color (so each true class shows distribution clearly)
    row_sums = cm.sum(axis=1, keepdims=True).clip(min=1)
    cm_norm = cm / row_sums

    im = ax.imshow(cm_norm, cmap="Blues", vmin=0, vmax=1, aspect="equal")
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(class_names, rotation=20, ha="right", fontsize=9, color=NAVY)
    ax.set_yticklabels(class_names, fontsize=9, color=NAVY)
    ax.set_xlabel("Predicted", fontsize=10, color=SLATE_600, labelpad=6)
    ax.set_ylabel("True label", fontsize=10, color=SLATE_600, labelpad=6)
    ax.set_title("Confusion Matrix", fontsize=12, fontweight="bold", color=NAVY, pad=12)

    for i in range(n):
        for j in range(n):
            count = cm[i, j]
            text_color = "#fff" if cm_norm[i, j] > 0.5 else NAVY
            ax.text(j, i, str(count), ha="center", va="center",
                    color=text_color, fontsize=11, fontweight="bold")

    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(length=0)


def draw_per_class_bars(ax, p: np.ndarray, r: np.ndarray, f1: np.ndarray,
                       sup: np.ndarray, class_names: list[str]) -> None:
    n = len(class_names)
    y = np.arange(n)
    width = 0.27
    ax.barh(y - width, p, width, color="#cbd5e1", label="Precision")
    ax.barh(y, r, width, color="#7dd3fc", label="Recall")
    ax.barh(y + width, f1, width, color=PRIMARY, label="F1")

    ax.set_yticks(y)
    ax.set_yticklabels([f"{name}\n(n={int(s)})" for name, s in zip(class_names, sup)],
                       fontsize=9, color=NAVY)
    ax.invert_yaxis()
    ax.set_xlim(0, 1.05)
    ax.set_xticks([0, 0.25, 0.5, 0.75, 1.0])
    ax.set_xticklabels(["0", "0.25", "0.50", "0.75", "1.00"], fontsize=8, color=SLATE_400)
    ax.set_xlabel("Score", fontsize=10, color=SLATE_600, labelpad=6)
    ax.set_title("Per-class Precision / Recall / F1", fontsize=12, fontweight="bold", color=NAVY, pad=12)
    ax.legend(loc="lower right", frameon=False, fontsize=9)
    ax.grid(axis="x", color="#e2e8f0", linewidth=0.6, zorder=0)
    for spine in ["top", "right", "left"]:
        ax.spines[spine].set_visible(False)
    ax.spines["bottom"].set_color("#e2e8f0")
    ax.tick_params(axis="y", length=0)
    ax.tick_params(axis="x", length=2, color="#cbd5e1")
    ax.set_axisbelow(True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="rp_v1", choices=["rp_v1", "partner"])
    parser.add_argument("--run-dir", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    run_dir = args.run_dir or latest_run_dir()
    rows = load_predictions(run_dir, args.model)
    if not rows:
        raise SystemExit(f"No predictions for model {args.model} in {run_dir}")

    label_arr = np.array([r["label"] for r in rows])
    pred_arr = np.array([r["predicted"] for r in rows])
    conf_arr = np.array([r["confidence"] for r in rows])
    correct_arr = (label_arr == pred_arr).astype(float)
    latency_arr = np.array([r["latency_ms"] for r in rows])

    cm = confusion_matrix(rows)
    p, r, f1, sup = per_class_prf(cm)
    n_total = len(rows)
    n_correct = int(correct_arr.sum())
    accuracy = n_correct / n_total if n_total else 0.0
    macro_f1 = float(f1.mean())
    weighted_f1 = float((f1 * sup).sum() / max(sup.sum(), 1))
    mean_latency_s = float(latency_arr.mean()) / 1000.0
    ece = expected_calibration_error(conf_arr, correct_arr)

    model_label, model_subtitle = MODEL_LABELS.get(args.model, (args.model, ""))

    # Class distribution string
    dist = {c: int((label_arr == c).sum()) for c in range(5)}
    dist_str = "  •  ".join(f"{name}: {dist[i]}" for i, name in enumerate(CLASS_NAMES))

    # ─── Compose the figure ───
    fig = plt.figure(figsize=(13, 10), facecolor=BG)
    gs = GridSpec(
        3, 4,
        figure=fig,
        height_ratios=[0.6, 1.6, 1.6],
        hspace=0.55, wspace=0.35,
        left=0.06, right=0.97, top=0.92, bottom=0.07,
    )

    # Header (spans all columns)
    header_ax = fig.add_axes([0.06, 0.93, 0.91, 0.06])
    header_ax.set_axis_off()
    header_ax.text(0, 0.7, model_label,
                   fontsize=22, fontweight="bold", color=NAVY)
    header_ax.text(0, 0.05, f"{model_subtitle}    •    {n_total} images    •    {dist_str}",
                   fontsize=9, color=SLATE_600)

    # Top row: 4 KPI tiles
    kpi_tile(fig.add_subplot(gs[0, 0]), f"{accuracy*100:.1f}%",
             f"Top-1 accuracy ({n_correct}/{n_total})",
             color=PRIMARY)
    kpi_tile(fig.add_subplot(gs[0, 1]), f"{macro_f1:.3f}",
             "Macro F1",
             color=EMERALD)
    kpi_tile(fig.add_subplot(gs[0, 2]), f"{ece:.3f}",
             "Top-1 ECE (lower is better)",
             color=AMBER)
    kpi_tile(fig.add_subplot(gs[0, 3]), f"{mean_latency_s:.1f}s",
             "Mean inference latency",
             color=SLATE_600)

    # Middle: confusion matrix
    cm_ax = fig.add_subplot(gs[1, :2])
    draw_confusion_matrix(cm_ax, cm, CLASS_NAMES)

    # Right: per-class bar chart
    bars_ax = fig.add_subplot(gs[1, 2:])
    draw_per_class_bars(bars_ax, p, r, f1, sup, CLASS_NAMES)

    # Bottom row: confidence vs accuracy reliability bars
    rel_ax = fig.add_subplot(gs[2, :2])
    bins = np.linspace(0, 1, 11)
    bin_acc = []
    bin_conf = []
    bin_n = []
    for i in range(10):
        lo, hi = bins[i], bins[i + 1]
        mask = (conf_arr > lo) & (conf_arr <= hi) if i > 0 else (conf_arr >= lo) & (conf_arr <= hi)
        bin_n.append(int(mask.sum()))
        if mask.sum() > 0:
            bin_acc.append(correct_arr[mask].mean())
            bin_conf.append(conf_arr[mask].mean())
        else:
            bin_acc.append(0)
            bin_conf.append(0)
    centers = (bins[:-1] + bins[1:]) / 2
    width = 0.08
    rel_ax.bar(centers, bin_acc, width=width, color=PRIMARY,
               edgecolor="white", linewidth=0.8, label="Accuracy", zorder=3)
    rel_ax.plot([0, 1], [0, 1], "--", color=SLATE_400, linewidth=1.2,
                label="Perfect calibration", zorder=2)
    for c, n in zip(centers, bin_n):
        if n > 0:
            rel_ax.text(c, -0.07, f"n={n}", ha="center", fontsize=7, color=SLATE_400)
    rel_ax.set_xlim(0, 1)
    rel_ax.set_ylim(-0.12, 1.05)
    rel_ax.set_xticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
    rel_ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0])
    rel_ax.set_xlabel("Confidence", fontsize=10, color=SLATE_600, labelpad=14)
    rel_ax.set_ylabel("Empirical accuracy", fontsize=10, color=SLATE_600)
    rel_ax.set_title("Reliability diagram", fontsize=12, fontweight="bold", color=NAVY, pad=12)
    rel_ax.legend(loc="upper left", frameon=False, fontsize=9)
    rel_ax.grid(color="#e2e8f0", linewidth=0.6, zorder=1)
    for spine in ["top", "right"]:
        rel_ax.spines[spine].set_visible(False)
    rel_ax.spines["left"].set_color("#cbd5e1")
    rel_ax.spines["bottom"].set_color("#cbd5e1")
    rel_ax.set_axisbelow(True)

    # Bottom right: confidence histogram
    hist_ax = fig.add_subplot(gs[2, 2:])
    correct_conf = conf_arr[correct_arr == 1]
    wrong_conf = conf_arr[correct_arr == 0]
    bins_h = np.linspace(0, 1, 21)
    hist_ax.hist(correct_conf, bins=bins_h, color=EMERALD, alpha=0.85,
                 edgecolor="white", linewidth=0.6, label=f"Correct (n={len(correct_conf)})")
    if len(wrong_conf):
        hist_ax.hist(wrong_conf, bins=bins_h, color=ROSE, alpha=0.85,
                     edgecolor="white", linewidth=0.6, label=f"Wrong (n={len(wrong_conf)})")
    hist_ax.set_xlim(0, 1)
    hist_ax.set_xlabel("Predicted-class confidence", fontsize=10, color=SLATE_600, labelpad=6)
    hist_ax.set_ylabel("Count", fontsize=10, color=SLATE_600)
    hist_ax.set_title("Confidence distribution", fontsize=12, fontweight="bold", color=NAVY, pad=12)
    hist_ax.legend(loc="upper left", frameon=False, fontsize=9)
    hist_ax.grid(axis="y", color="#e2e8f0", linewidth=0.6, zorder=0)
    for spine in ["top", "right"]:
        hist_ax.spines[spine].set_visible(False)
    hist_ax.spines["left"].set_color("#cbd5e1")
    hist_ax.spines["bottom"].set_color("#cbd5e1")
    hist_ax.set_axisbelow(True)

    # Footer
    fig.text(0.06, 0.015, f"Source: {run_dir.name}    •    Test set: APTOS labeled subset",
             fontsize=8, color=SLATE_400)
    fig.text(0.97, 0.015, "Generated by scripts/render_metrics.py",
             fontsize=8, color=SLATE_400, ha="right")

    out_path = args.out or (run_dir / f"metrics_{args.model}.png")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=160, facecolor=BG, bbox_inches="tight")
    plt.close(fig)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
