"""
Ebbinghaus forgetting curve fitting and retrievability scoring.

Model:  R(t) = exp(-(t / S)^b)
  - R : retrievability (recall probability)
  - t : time since last review (hours)
  - S : stability (hours)
  - b : decay exponent

Per student × topic: fit S and b via scipy.optimize.curve_fit,
compute current R, flag decay risk.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
from scipy.optimize import curve_fit

from .schemas import DecayRisk, TopicMemory


def _ebbinghaus(t: np.ndarray, S: float, b: float) -> np.ndarray:
    return np.exp(-((t / S) ** b))


def _fit_topic(reviews: list[dict]) -> tuple[float, float]:
    if len(reviews) < 2:
        return (168.0, 0.5)

    sorted_r = sorted(reviews, key=lambda r: r["ts"])
    t_vals, r_vals = [], []
    for i in range(1, len(sorted_r)):
        gap = (sorted_r[i]["ts"] - sorted_r[i-1]["ts"]).total_seconds() / 3600.0
        if gap < 0.1:
            continue
        t_vals.append(gap)
        r_vals.append(sorted_r[i]["score"])

    if len(t_vals) < 2:
        return (168.0, 0.5)

    t_arr = np.array(t_vals[:50])
    r_arr = np.clip(np.array(r_vals[:50]), 0.01, 0.99)

    try:
        popt, _ = curve_fit(_ebbinghaus, t_arr, r_arr,
                             p0=[168.0, 0.5],
                             bounds=([1.0, 0.05], [5000.0, 3.0]),
                             maxfev=4000)
        return float(popt[0]), float(popt[1])
    except RuntimeError:
        return (168.0, 0.5)


def compute_topic_memories(review_history: list[dict[str, Any]]) -> list[TopicMemory]:
    now = datetime.now(timezone.utc)
    results: list[TopicMemory] = []

    for entry in review_history:
        S, b = _fit_topic(entry["reviews"])
        last_ts = max(r["ts"] for r in entry["reviews"])
        hours_since = (now - last_ts).total_seconds() / 3600.0

        R = float(np.clip(np.exp(-((hours_since / S) ** b)), 0.0, 1.0))

        if R >= 0.85:
            risk = DecayRisk.SAFE
        elif R >= 0.70:
            risk = DecayRisk.WARNING
        else:
            risk = DecayRisk.CRITICAL

        t_threshold = S * ((-np.log(0.70)) ** (1.0 / b))
        next_review = last_ts + timedelta(hours=t_threshold) if hours_since < t_threshold else now

        results.append(TopicMemory(
            topic_id=entry["topic_id"],
            topic_name=entry["topic_name"],
            stability_days=round(S / 24.0, 2),
            decay_rate=round(b, 4),
            retrievability=round(R, 4),
            hours_since_last_review=round(hours_since, 1),
            decay_risk=risk,
            next_optimal_review=next_review,
        ))

    return results
