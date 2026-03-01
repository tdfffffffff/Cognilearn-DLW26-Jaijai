"""
Circadian peak-window detection + study schedule builder.

Peak Detection:
  1. Build 24-bin histogram of productivity-weighted session minutes
  2. Smooth with circular Gaussian kernel
  3. Find contiguous window with highest integral

Schedule Builder:
  - Deep work in peak window (critical/warning topics)
  - Light/review in off-peak (safe topics)
  - Cap: ≤ 4h deep, ≤ 2h light
"""

from __future__ import annotations

import numpy as np

from .schemas import (
    CircadianWindow,
    ScheduleBlock,
    StudySchedule,
    TaskIntensity,
    TopicMemory,
)


def _circular_smooth(hist: np.ndarray, sigma: float = 1.5) -> np.ndarray:
    kr = int(3 * sigma) + 1
    k = np.exp(-0.5 * (np.arange(-kr, kr + 1) / sigma) ** 2)
    k /= k.sum()
    padded = np.concatenate([hist[-kr:], hist, hist[:kr]])
    return np.convolve(padded, k, mode="valid")[:24]


def detect_circadian_peak(
    attention_history: list[dict],
    window_size: int = 3,
    tz: str = "UTC",
) -> CircadianWindow:

    hist = np.zeros(24, dtype=float)
    durations: list[float] = []

    for rec in attention_history:
        h = int(rec["start_hour"]) % 24
        hist[h] += rec["duration_min"] * rec["productivity_score"]
        durations.append(rec["duration_min"])

    if hist.sum() < 1e-9:
        return CircadianWindow(peak_start_hour=9, peak_end_hour=12,
                                confidence=0.0, median_session_minutes=0.0, timezone=tz)

    hist /= hist.sum()
    smoothed = _circular_smooth(hist)
    doubled = np.concatenate([smoothed, smoothed])

    best_sum, best_start = -1.0, 0
    for s in range(24):
        val = doubled[s:s + window_size].sum()
        if val > best_sum:
            best_sum, best_start = val, s

    peak_start = best_start % 24
    peak_end = (best_start + window_size) % 24
    concentration = best_sum / (window_size / 24.0 + 1e-9)
    confidence = float(np.clip(1.0 - 1.0 / (concentration + 1e-9), 0.0, 1.0))
    median_dur = float(np.median(durations)) if durations else 0.0

    return CircadianWindow(
        peak_start_hour=peak_start, peak_end_hour=peak_end,
        confidence=round(confidence, 3),
        median_session_minutes=round(median_dur, 1), timezone=tz,
    )


def _hours_in_range(start: int, end: int) -> list[int]:
    hours, h = [], start
    while h != end:
        hours.append(h)
        h = (h + 1) % 24
    return hours


def build_schedule(
    circadian: CircadianWindow,
    topic_memories: list[TopicMemory],
    max_deep: int = 240,
    max_light: int = 120,
) -> StudySchedule:

    sorted_topics = sorted(topic_memories, key=lambda t: t.retrievability)
    deep_topics = [t for t in sorted_topics if t.retrievability < 0.85]
    review_topics = [t for t in sorted_topics if t.retrievability >= 0.85]

    peak_hours = _hours_in_range(circadian.peak_start_hour, circadian.peak_end_hour)
    off_peak = sorted(set(range(24)) - set(peak_hours))

    blocks: list[ScheduleBlock] = []
    deep_used = light_used = 0

    # Deep blocks in peak
    remaining = list(peak_hours)
    ti = 0
    while remaining and deep_used < max_deep and ti < len(deep_topics):
        bl = min(2, len(remaining))
        s_h, e_h = remaining[0], (remaining[0] + bl) % 24
        remaining = remaining[bl:]
        topic = deep_topics[ti]
        blocks.append(ScheduleBlock(
            start_hour=s_h, end_hour=e_h, intensity=TaskIntensity.DEEP,
            suggested_topics=[f"{topic.topic_name} (R={topic.retrievability:.0%})"],
            rationale=f"Deep focus — retrievability {topic.retrievability:.0%}, "
                      f"risk {topic.decay_risk.value}.",
        ))
        deep_used += bl * 60
        ti += 1

    # Light blocks off-peak
    candidates = [h for h in off_peak if 8 <= h <= 22][:2] or off_peak[:2]
    ri = 0
    for h in candidates:
        if light_used >= max_light:
            break
        names = []
        if ri < len(review_topics):
            names.append(review_topics[ri].topic_name)
            ri += 1
        elif deep_topics:
            names.append(deep_topics[0].topic_name + " (light review)")
        else:
            names.append("General review")

        blocks.append(ScheduleBlock(
            start_hour=h, end_hour=(h + 1) % 24,
            intensity=TaskIntensity.LIGHT,
            suggested_topics=names,
            rationale="Off-peak — lighter cognitive load for review.",
        ))
        light_used += 60

    blocks.sort(key=lambda b: b.start_hour)
    return StudySchedule(blocks=blocks, total_deep_minutes=deep_used,
                          total_light_minutes=light_used)
