"""
Synthetic data generator for MindMap v2.

Generates deterministic per-student data across all features:
  - Quiz interaction events (for error classifier)
  - Review history (for forgetting curves)
  - Login time-series (for GRU momentum)
  - Attention / session records (for circadian detection)
  - Voice session results (for concept gap)

Uses student_id as seed for reproducibility.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np


def _seed(student_id: str) -> int:
    return int(hashlib.sha256(student_id.encode()).hexdigest(), 16) % (2**31)


# ── Topic catalogue with concept maps ────────────────────────────────────────

TOPICS = [
    ("T001", "Integration by Substitution"),
    ("T002", "Chain Rule"),
    ("T003", "Limits & Continuity"),
    ("T004", "Differential Equations"),
    ("T005", "Series & Sequences"),
    ("T006", "Multivariable Calculus"),
]

CONCEPT_MAPS: dict[str, list[str]] = {
    "T001": ["u-substitution", "chain rule", "inner function", "derivative",
             "du", "antiderivative", "composite function", "change of variable"],
    "T002": ["derivative", "composition", "outer function", "inner function",
             "product rule", "chain", "implicit differentiation"],
    "T003": ["epsilon-delta", "continuity", "one-sided limit", "squeeze theorem",
             "discontinuity", "asymptote", "L'Hopital"],
    "T004": ["separation of variables", "integrating factor", "initial value",
             "homogeneous", "particular solution", "general solution"],
    "T005": ["convergence", "divergence", "ratio test", "Taylor series",
             "Maclaurin", "power series", "radius of convergence"],
    "T006": ["partial derivative", "gradient", "double integral",
             "Jacobian", "surface integral", "divergence theorem"],
}

PREREQUISITE_GRAPH: list[tuple[str, str]] = [
    ("T002", "T001"),  # chain rule → substitution
    ("T003", "T002"),  # limits → chain rule
    ("T001", "T004"),  # substitution → diff eq
    ("T002", "T004"),  # chain rule → diff eq
    ("T001", "T005"),  # substitution → series
    ("T001", "T006"),  # substitution → multivariable
    ("T003", "T006"),  # limits → multivariable
]


# ── Quiz interaction data (for error classifier) ─────────────────────────────

def generate_quiz_events(student_id: str) -> list[dict[str, Any]]:
    """Generate per-topic quiz attempt events with error-type signals baked in.

    Each record: {topic_id, topic_name, attempts: [{correct, response_time_s,
                  hint_used, timed, attempt_number}]}
    """
    rng = np.random.default_rng(_seed(student_id))

    # Each student has a dominant error archetype for 1-2 topics
    archetype_probs = rng.dirichlet([2, 1, 1, 1])  # bias toward one type
    topic_archetypes = {}
    for tid, _ in TOPICS:
        topic_archetypes[tid] = rng.choice(
            ["conceptual", "careless", "time_constraint", "application"],
            p=archetype_probs,
        )

    all_events: list[dict] = []
    for tid, tname in TOPICS:
        arch = topic_archetypes[tid]
        n_attempts = int(rng.integers(8, 35))
        attempts = []

        for i in range(n_attempts):
            if arch == "conceptual":
                correct = bool(rng.random() < 0.30)
                rt = float(rng.normal(45, 15))
                hint = bool(rng.random() < 0.6)
            elif arch == "careless":
                correct = bool(rng.random() < 0.80)
                rt = float(rng.normal(12, 5))
                hint = bool(rng.random() < 0.05)
            elif arch == "time_constraint":
                timed = bool(rng.random() < 0.5)
                if timed:
                    correct = bool(rng.random() < 0.35)
                    rt = float(rng.normal(55, 20))
                else:
                    correct = bool(rng.random() < 0.80)
                    rt = float(rng.normal(30, 10))
                hint = bool(rng.random() < 0.15)
                attempts.append({
                    "correct": correct,
                    "response_time_s": max(3.0, round(rt, 1)),
                    "hint_used": hint,
                    "timed": timed,
                    "attempt_number": i + 1,
                })
                continue
            else:  # application
                if i < n_attempts // 2:
                    correct = bool(rng.random() < 0.82)
                else:
                    correct = bool(rng.random() < 0.45)
                rt = float(rng.normal(35, 12))
                hint = bool(rng.random() < 0.20)

            attempts.append({
                "correct": correct,
                "response_time_s": max(3.0, round(rt, 1)),
                "hint_used": hint,
                "timed": bool(rng.random() < 0.3),
                "attempt_number": i + 1,
            })

        all_events.append({
            "topic_id": tid,
            "topic_name": tname,
            "attempts": attempts,
        })

    return all_events


# ── Review history (for forgetting curves) ───────────────────────────────────

def generate_review_history(student_id: str) -> list[dict[str, Any]]:
    rng = np.random.default_rng(_seed(student_id))
    now = datetime.now(timezone.utc)
    history: list[dict] = []

    for tid, tname in TOPICS:
        n = int(rng.integers(3, 12))
        offsets = sorted(rng.choice(90, size=n, replace=False))
        reviews = []
        for d in offsets:
            ts = now - timedelta(days=int(90 - d),
                                  hours=int(rng.integers(0, 24)))
            score = float(np.clip(rng.normal(0.75, 0.15), 0.1, 1.0))
            reviews.append({"ts": ts, "score": score})
        history.append({"topic_id": tid, "topic_name": tname, "reviews": reviews})

    return history


# ── Login time-series (for GRU momentum) ─────────────────────────────────────

def generate_login_series(student_id: str, days: int = 120) -> np.ndarray:
    rng = np.random.default_rng(_seed(student_id))
    t = np.arange(days, dtype=float)
    trend = 0.02 * rng.standard_normal() * t
    seasonal = 1.5 * np.sin(2 * np.pi * t / 7 + rng.uniform(0, 2 * np.pi))
    base = np.clip(3 + trend + seasonal + rng.normal(0, 0.8, size=days), 0, None)
    return rng.poisson(base).astype(np.float32)


# ── Interaction events (for avoidance detection) ─────────────────────────────

def generate_interaction_events(student_id: str) -> list[dict[str, Any]]:
    rng = np.random.default_rng(_seed(student_id))
    events: list[dict] = []
    for tid, tname in TOPICS:
        offered = int(rng.integers(15, 60))
        skip_prob = float(rng.beta(2, 5))
        skipped = int(rng.binomial(offered, skip_prob))
        completed = offered - skipped
        hints_used = int(rng.binomial(completed, float(rng.beta(2, 8))))
        events.append({
            "topic_id": tid, "topic_name": tname,
            "offered": offered, "completed": completed,
            "skipped": skipped, "hints_used": hints_used,
        })
    return events


# ── Attention / Session history (for circadian + eye tracking) ───────────────

def generate_attention_history(student_id: str, days: int = 60) -> list[dict]:
    rng = np.random.default_rng(_seed(student_id))
    now = datetime.now(timezone.utc)

    peak_hour = int(rng.normal(9, 1.5)) if rng.random() < 0.55 else int(rng.normal(20, 1.5))
    records: list[dict] = []

    for d in range(days):
        n_sessions = int(rng.integers(1, 5))
        for _ in range(n_sessions):
            hour = int(np.clip(rng.normal(peak_hour, 3), 0, 23))
            duration = float(np.clip(rng.normal(45, 20), 10, 180))
            dist = min(abs(hour - peak_hour), 24 - abs(hour - peak_hour))
            productivity = float(np.clip(1.0 - 0.07 * dist + rng.normal(0, 0.08), 0, 1))

            # EAR values (eye tracking proxy)
            ear = float(np.clip(rng.normal(0.28, 0.04), 0.12, 0.40))
            focused_pct = float(np.clip(productivity * 100, 20, 95))
            drowsy_pct = float(np.clip(rng.normal(10, 8), 0, 40))
            distracted_pct = float(np.clip(100 - focused_pct - drowsy_pct, 0, 50))

            fatigue_onset = None
            if drowsy_pct > 15:
                fatigue_onset = float(np.clip(rng.normal(20, 8), 8, duration))

            records.append({
                "date": (now - timedelta(days=days - d)).date().isoformat(),
                "start_hour": hour,
                "duration_min": round(duration, 1),
                "productivity_score": round(productivity, 3),
                "ear_mean": round(ear, 3),
                "focused_pct": round(focused_pct, 1),
                "distracted_pct": round(distracted_pct, 1),
                "drowsy_pct": round(drowsy_pct, 1),
                "fatigue_onset_min": round(fatigue_onset, 1) if fatigue_onset else None,
            })
    return records


# ── Voice session data (simulated) ───────────────────────────────────────────

def generate_voice_session(student_id: str, topic_id: str) -> dict[str, Any]:
    """Simulate a voice concept-coverage session for a topic."""
    rng = np.random.default_rng(_seed(student_id + topic_id))
    expected = CONCEPT_MAPS.get(topic_id, ["concept_a", "concept_b", "concept_c"])
    n_mentioned = int(rng.integers(1, len(expected) + 1))
    mentioned = list(rng.choice(expected, size=n_mentioned, replace=False))
    missing = [k for k in expected if k not in mentioned]
    coverage = len(mentioned) / len(expected)

    return {
        "topic_id": topic_id,
        "topic_name": dict(TOPICS).get(topic_id, topic_id),
        "extracted_keywords": mentioned,
        "expected_keywords": expected,
        "missing_keywords": missing,
        "coverage_score": round(coverage, 3),
    }


# ── Demo student profiles ────────────────────────────────────────────────────

DEMO_STUDENTS = {
    "aisha": {
        "id": "aisha",
        "name": "Aisha, Year 2 CS",
        "description": "Calculus · Score: 65% · 3 weeks of data",
        "archetype": "misconception",
        "dominant_error": "conceptual",
        "voice_coverage": 0.37,
        "fatigue_onset_min": 19,
        "peak_hour": 21,
        "engagement": "Active",
    },
    "marcus": {
        "id": "marcus",
        "name": "Marcus, Year 2 CS",
        "description": "Calculus · Score: 65% · 3 weeks + 10-day gap",
        "archetype": "decay",
        "dominant_error": "application",
        "voice_coverage": 0.71,
        "fatigue_onset_min": 28,
        "peak_hour": 10,
        "engagement": "Slowing",
    },
}
