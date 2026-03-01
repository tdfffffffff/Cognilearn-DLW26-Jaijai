"""
Eye Tracking — Attention Monitor + Adaptive Break Cycle.

Webcam + MediaPipe FaceMesh → EAR + gaze → attention state classification.
Session-level aggregation. Adaptive Pomodoro timing from fatigue onset.

States:
  🟢 Focused    — EAR > 0.25, gaze on-screen, deviation < 15%
  🟡 Distracted — gaze off-screen, head rotation > 15°
  🟠 Drowsy     — EAR < 0.20 for 3+ sec, slow blinks
  🔴 Not Present — no face detected > 30s

Privacy: frames processed in memory, never saved to disk.
"""

from __future__ import annotations

import numpy as np

from .schemas import AdaptiveBreak, AttentionSnapshot


def compute_attention_stats(attention_history: list[dict]) -> AttentionSnapshot:
    """Aggregate session-level attention statistics from attention records."""

    if not attention_history:
        return AttentionSnapshot(
            total_seconds=0, focused_pct=0.0, distracted_pct=0.0,
            drowsy_pct=0.0, not_present_pct=0.0,
            fatigue_onset_min=None, ear_mean=0.28,
        )

    total_dur = sum(r["duration_min"] for r in attention_history) * 60  # seconds
    focused = np.mean([r["focused_pct"] for r in attention_history])
    distracted = np.mean([r["distracted_pct"] for r in attention_history])
    drowsy = np.mean([r["drowsy_pct"] for r in attention_history])
    not_present = max(0.0, 100.0 - focused - distracted - drowsy)
    ear_mean = np.mean([r["ear_mean"] for r in attention_history])

    fatigue_onsets = [r["fatigue_onset_min"] for r in attention_history
                      if r.get("fatigue_onset_min") is not None]
    fatigue_onset = float(np.median(fatigue_onsets)) if fatigue_onsets else None

    return AttentionSnapshot(
        total_seconds=int(total_dur),
        focused_pct=round(float(focused), 1),
        distracted_pct=round(float(distracted), 1),
        drowsy_pct=round(float(drowsy), 1),
        not_present_pct=round(float(not_present), 1),
        fatigue_onset_min=round(fatigue_onset, 1) if fatigue_onset else None,
        ear_mean=round(float(ear_mean), 3),
    )


def compute_adaptive_break(attention: AttentionSnapshot) -> AdaptiveBreak:
    """Determine personalised Pomodoro timing from fatigue data.

    Logic:
      fatigue < 15 min → 15 min work / 5 min break
      fatigue 15–25 min → 20 min work / 5 min break
      fatigue > 25 min → standard 25 min Pomodoro
      focused > 80% sustained → 45 min work / 10 min break
    """
    fo = attention.fatigue_onset_min

    if attention.focused_pct > 80 and (fo is None or fo > 35):
        return AdaptiveBreak(
            work_minutes=45, break_minutes=10,
            rationale="Sustained high focus (>80%) — extended deep-work block.",
        )

    if fo is None or fo > 25:
        return AdaptiveBreak(
            work_minutes=25, break_minutes=5,
            rationale="Standard Pomodoro — fatigue onset healthy (>25 min).",
        )

    if fo >= 15:
        return AdaptiveBreak(
            work_minutes=20, break_minutes=5,
            rationale=f"Focus drops after ~{fo:.0f} min — shortened work block.",
        )

    return AdaptiveBreak(
        work_minutes=15, break_minutes=5,
        rationale=f"Early fatigue onset (~{fo:.0f} min) — short focused bursts.",
    )
