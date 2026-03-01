"""
Engagement health classifier + avoidance pattern detection.

Engagement Labels:
  Active   — consistent, above-average engagement
  Coasting — stable but below-average effort
  Slowing  — downward trend in recent activity
  At Risk  — steep decline or prolonged inactivity

Avoidance Signals:
  • High skip rate (> 30%)
  • Hint spike (hints/completed > 2× baseline)
  • Consecutive skips ≥ 3
"""

from __future__ import annotations

import numpy as np

from .schemas import (
    AvoidanceSignal,
    EngagementHealth,
    EngagementLabel,
    MomentumSnapshot,
)


def classify_engagement(
    momentum: MomentumSnapshot,
    login_series: np.ndarray,
    interaction_events: list[dict],
) -> EngagementHealth:

    recent_mean = float(login_series[-7:].mean()) if len(login_series) >= 7 else float(login_series.mean())
    overall_mean = float(login_series.mean())
    ratio = recent_mean / (overall_mean + 1e-9)

    total_offered = sum(e["offered"] for e in interaction_events)
    total_completed = sum(e["completed"] for e in interaction_events)
    completion_rate = total_completed / (total_offered + 1e-9)

    features = {
        "trend_7d": momentum.trend_7d,
        "trend_14d": momentum.trend_14d,
        "momentum_score": momentum.momentum_score,
        "recent_vs_overall": round(ratio, 3),
        "completion_rate": round(completion_rate, 3),
    }

    score = (
        0.25 * min(momentum.trend_7d / 0.5, 1.0)
        + 0.15 * min(momentum.trend_14d / 0.5, 1.0)
        + 0.20 * momentum.momentum_score
        + 0.20 * min(ratio, 1.5) / 1.5
        + 0.20 * completion_rate
    )

    if score >= 0.65:
        label, conf = EngagementLabel.ACTIVE, min(score, 1.0)
    elif score >= 0.45:
        label, conf = EngagementLabel.COASTING, 0.5 + 0.5 * (score - 0.45) / 0.20
    elif score >= 0.25:
        label, conf = EngagementLabel.SLOWING, 0.5 + 0.5 * (0.45 - score) / 0.20
    else:
        label, conf = EngagementLabel.AT_RISK, min(1.0, 1.0 - score)

    return EngagementHealth(
        label=label,
        confidence=round(float(np.clip(conf, 0.0, 1.0)), 3),
        features_used=features,
    )


def detect_avoidance(interaction_events: list[dict]) -> list[AvoidanceSignal]:
    total_hints = sum(e["hints_used"] for e in interaction_events)
    total_completed = sum(e["completed"] for e in interaction_events)
    baseline_hint_rate = total_hints / (total_completed + 1e-9)

    signals: list[AvoidanceSignal] = []
    for ev in interaction_events:
        offered, skipped = ev["offered"], ev["skipped"]
        completed, hints = ev["completed"], ev["hints_used"]

        skip_rate = skipped / (offered + 1e-9)
        hint_rate = hints / (completed + 1e-9)
        hint_spike = hint_rate > 2.0 * baseline_hint_rate and hints >= 3
        consecutive = max(0, int(skip_rate * offered * 0.4))

        flags = int(skip_rate > 0.30) + int(hint_spike) + int(consecutive >= 3)
        if flags == 0:
            continue

        severity = "low" if flags == 1 else ("medium" if flags == 2 else "high")
        signals.append(AvoidanceSignal(
            topic_id=ev["topic_id"], topic_name=ev["topic_name"],
            skip_rate=round(skip_rate, 3), hint_spike=hint_spike,
            consecutive_skips=consecutive, severity=severity,
        ))

    return signals
