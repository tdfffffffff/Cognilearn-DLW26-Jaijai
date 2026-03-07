"""
Error Classification — 4 Cognitive Types (XGBoost + SHAP).

Types:
  1. Conceptual  — knowledge_gap or misconception sub-type
  2. Careless    — high accuracy overall, random failures
  3. Time Constraint — good untimed, poor under time pressure
  4. Application — transfer_failure or decay sub-type

Feature engineering from quiz attempt data, then XGBoost classification
with SHAP explanations translated to plain English.
"""

from __future__ import annotations

from typing import Any

import numpy as np

try:
    import xgboost as xgb
    import shap

    _HAS_XGBOOST = True
except ImportError:
    _HAS_XGBOOST = False

from .schemas import (
    ConfidenceTier,
    ErrorDiagnosis,
    ErrorProfile,
    ErrorSubType,
    ErrorType,
    InterventionType,
)

# ── Feature engineering ──────────────────────────────────────────────────────

def _engineer_features(attempts: list[dict]) -> dict[str, float]:
    """Extract classifier features from raw quiz attempts."""
    if not attempts:
        return {
            "accuracy": 0.0, "accuracy_variance": 0.0, "mean_rt": 0.0,
            "fast_wrong_rate": 0.0, "slow_wrong_rate": 0.0,
            "hint_dependency": 0.0, "timed_delta": 0.0,
            "improvement_slope": 0.0, "attempt_count": 0.0,
        }

    corrects = [a["correct"] for a in attempts]
    rts = [a["response_time_s"] for a in attempts]
    hints = [a["hint_used"] for a in attempts]
    timed = [a.get("timed", False) for a in attempts]

    accuracy = np.mean(corrects)

    # accuracy variance (rolling window of 5)
    window = 5
    if len(corrects) >= window:
        rolling = [np.mean(corrects[i:i+window]) for i in range(len(corrects) - window + 1)]
        accuracy_variance = float(np.var(rolling))
    else:
        accuracy_variance = float(np.var(corrects))

    mean_rt = float(np.mean(rts))

    # fast-wrong: answered quickly but incorrectly
    fast_wrong = sum(1 for c, r in zip(corrects, rts) if not c and r < np.median(rts))
    fast_wrong_rate = fast_wrong / (len(attempts) + 1e-9)

    # slow-wrong: answered slowly and incorrectly
    slow_wrong = sum(1 for c, r in zip(corrects, rts) if not c and r >= np.median(rts))
    slow_wrong_rate = slow_wrong / (len(attempts) + 1e-9)

    hint_dependency = float(np.mean(hints))

    # timed vs untimed delta
    timed_acc = [c for c, t in zip(corrects, timed) if t]
    untimed_acc = [c for c, t in zip(corrects, timed) if not t]
    timed_delta = (np.mean(untimed_acc) if untimed_acc else 0.5) - \
                  (np.mean(timed_acc) if timed_acc else 0.5)

    # improvement slope (linear fit on attempt correctness)
    x = np.arange(len(corrects), dtype=float)
    if len(x) >= 2:
        x_c = x - x.mean()
        y_c = np.array(corrects, dtype=float) - np.mean(corrects)
        improvement_slope = float(np.dot(x_c, y_c) / (np.dot(x_c, x_c) + 1e-9))
    else:
        improvement_slope = 0.0

    return {
        "accuracy": round(float(accuracy), 4),
        "accuracy_variance": round(accuracy_variance, 4),
        "mean_rt": round(mean_rt, 2),
        "fast_wrong_rate": round(fast_wrong_rate, 4),
        "slow_wrong_rate": round(slow_wrong_rate, 4),
        "hint_dependency": round(hint_dependency, 4),
        "timed_delta": round(float(timed_delta), 4),
        "improvement_slope": round(improvement_slope, 6),
        "attempt_count": float(len(attempts)),
    }


# ── Rule-based classifier (fallback when XGBoost unavailable) ────────────────

def _rule_classify(features: dict[str, float]) -> tuple[ErrorType, ErrorSubType, float, str]:
    """Deterministic rule-based classification with explainability."""

    acc = features["accuracy"]
    var = features["accuracy_variance"]
    hint = features["hint_dependency"]
    timed_d = features["timed_delta"]
    slope = features["improvement_slope"]
    fw = features["fast_wrong_rate"]

    # Time constraint pattern
    if timed_d > 0.25:
        return (
            ErrorType.TIME_CONSTRAINT,
            ErrorSubType.NONE,
            min(0.6 + timed_d, 0.95),
            f"Accuracy drops {timed_d:.0%} under timed conditions despite "
            f"performing well untimed — classic time-pressure anxiety pattern.",
        )

    # Careless pattern
    if acc > 0.65 and var > 0.03 and hint < 0.1:
        return (
            ErrorType.CARELESS,
            ErrorSubType.NONE,
            min(0.5 + var * 5, 0.92),
            f"High overall accuracy ({acc:.0%}) but high variance — "
            f"random failures despite knowing material. Fast answers, no hints.",
        )

    # Application / decay pattern
    if slope < -0.005:
        sub = ErrorSubType.DECAY if acc > 0.5 else ErrorSubType.TRANSFER_FAILURE
        return (
            ErrorType.APPLICATION,
            sub,
            min(0.5 + abs(slope) * 50, 0.90),
            f"Negative improvement slope ({slope:.4f}) — performance declining "
            f"over time. {'Memory decay detected.' if sub == ErrorSubType.DECAY else 'Transfer failure across topics.'}",
        )

    # Conceptual pattern
    if acc < 0.50 and hint > 0.3:
        sub = ErrorSubType.MISCONCEPTION if fw > 0.15 else ErrorSubType.KNOWLEDGE_GAP
        return (
            ErrorType.CONCEPTUAL,
            sub,
            min(0.5 + (1 - acc) * 0.5, 0.93),
            f"Low accuracy ({acc:.0%}) with high hint dependency ({hint:.0%}) — "
            f"{'answering fast but wrong = misconception' if sub == ErrorSubType.MISCONCEPTION else 'knowledge gap, never learned properly'}.",
        )

    if acc < 0.55:
        return (
            ErrorType.CONCEPTUAL,
            ErrorSubType.KNOWLEDGE_GAP,
            0.55,
            f"Low accuracy ({acc:.0%}) across attempts — foundational understanding missing.",
        )

    # Default
    return (
        ErrorType.CARELESS,
        ErrorSubType.NONE,
        0.45,
        f"No strong error pattern detected — accuracy {acc:.0%} with moderate variance.",
    )


# ── XGBoost classifier ──────────────────────────────────────────────────────

def _train_xgboost_classifier(all_features: list[dict[str, float]],
                               all_labels: list[int]):
    """Train an XGBoost model on the generated feature set."""
    if not _HAS_XGBOOST or len(all_features) < 4:
        return None, None

    feature_names = list(all_features[0].keys())
    X = np.array([[f[k] for k in feature_names] for f in all_features])
    y = np.array(all_labels)

    model = xgb.XGBClassifier(
        n_estimators=50, max_depth=4, learning_rate=0.1,
        use_label_encoder=False, eval_metric="mlogloss",
        verbosity=0,
    )
    model.fit(X, y)
    explainer = shap.TreeExplainer(model)
    return model, explainer


# ── Intervention routing ─────────────────────────────────────────────────────

_INTERVENTION_MAP: dict[tuple[ErrorType, ErrorSubType], InterventionType] = {
    (ErrorType.CONCEPTUAL, ErrorSubType.KNOWLEDGE_GAP): InterventionType.CONCEPT_EXPLANATION,
    (ErrorType.CONCEPTUAL, ErrorSubType.MISCONCEPTION): InterventionType.MYTH_BUSTING,
    (ErrorType.CARELESS, ErrorSubType.NONE): InterventionType.TIMED_DRILL,
    (ErrorType.TIME_CONSTRAINT, ErrorSubType.NONE): InterventionType.UNTIMED_PRACTICE,
    (ErrorType.APPLICATION, ErrorSubType.TRANSFER_FAILURE): InterventionType.CROSS_TOPIC_EXAMPLE,
    (ErrorType.APPLICATION, ErrorSubType.DECAY): InterventionType.SPACED_RETRIEVAL,
}


def _get_intervention(et: ErrorType, sub: ErrorSubType) -> InterventionType:
    return _INTERVENTION_MAP.get((et, sub), InterventionType.CONCEPT_EXPLANATION)

# ── Confidence tier computation ───────────────────────────────────────

def _compute_confidence_tier(proba: float, attempt_count: int) -> ConfidenceTier:
    """Derive a human-readable data-quality tier.

    Tiers:
      🔴 Provisional  — < 10 interactions (too little data to trust)
      🟡 Uncertain    — proba < 0.55 (pattern doesn’t fit trained profiles)
      🟠 Developing   — proba < 0.75 *or* < 40 interactions
      🟢 Reliable     — proba ≥ 0.75 with 40+ interactions
    """
    if attempt_count < 10:
        return ConfidenceTier.PROVISIONAL
    if proba < 0.55:
        return ConfidenceTier.UNCERTAIN
    if proba < 0.75 or attempt_count < 40:
        return ConfidenceTier.DEVELOPING
    return ConfidenceTier.RELIABLE


# ── Out-of-distribution (OOD) detection ──────────────────────────────

def _detect_ood(features: dict[str, float],
               all_features: list[dict[str, float]],
               proba: float) -> tuple[bool, str]:
    """Flag behaviour that doesn’t match any trained profile.

    Uses two complementary signals:
      1. Max probability < 0.35 — XGBoost can’t confidently pick any class.
      2. Mahalanobis-style z-score — feature vector is far from training mean.

    Returns (is_ood, reason).
    """
    # Signal 1: classifier indecision
    if proba < 0.35:
        return True, (
            "Unusual pattern — the classifier could not confidently match "
            "this behaviour to any known error type. We’ll flag this for "
            "review rather than guess."
        )

    # Signal 2: feature-space outlier detection
    if len(all_features) >= 4:
        feat_keys = list(features.keys())
        vec = np.array([features[k] for k in feat_keys])
        mat = np.array([[f[k] for k in feat_keys] for f in all_features])
        mean = mat.mean(axis=0)
        std = mat.std(axis=0) + 1e-9  # avoid division by zero
        z_scores = np.abs((vec - mean) / std)
        # If more than 3 features are > 2.5 std from mean, flag OOD
        outlier_count = int(np.sum(z_scores > 2.5))
        if outlier_count >= 3:
            outlier_names = [feat_keys[i] for i in range(len(feat_keys))
                             if z_scores[i] > 2.5]
            return True, (
                f"Unusual pattern — {outlier_count} features are far outside "
                f"normal ranges ({', '.join(outlier_names)}). We’ll flag this "
                f"for review rather than guess."
            )
        # Also check max z-score for extreme single-feature outliers
        max_z = float(np.max(z_scores))
        if max_z > 4.0:
            outlier_idx = int(np.argmax(z_scores))
            return True, (
                f"Unusual pattern — {feat_keys[outlier_idx]} is extremely "
                f"far from normal (z={max_z:.1f}). We’ll flag this for "
                f"review rather than guess."
            )

    return False, ""

# ── Public API ───────────────────────────────────────────────────────────────

def classify_errors(student_id: str,
                    quiz_events: list[dict[str, Any]]) -> ErrorProfile:
    """Run error classification across all topics for a student."""

    # Feature-engineer each topic
    topic_features: list[tuple[str, str, dict[str, float], list[dict]]] = []
    for ev in quiz_events:
        feats = _engineer_features(ev["attempts"])
        topic_features.append((ev["topic_id"], ev["topic_name"], feats, ev["attempts"]))

    cold_start = all(f["attempt_count"] < 5 for _, _, f, _ in topic_features)

    # Try XGBoost; fall back to rules
    diagnoses: list[ErrorDiagnosis] = []
    label_map = {ErrorType.CONCEPTUAL: 0, ErrorType.CARELESS: 1,
                 ErrorType.TIME_CONSTRAINT: 2, ErrorType.APPLICATION: 3}

    # Generate training data from rule labels for XGBoost
    all_feats = [f for _, _, f, _ in topic_features]
    rule_results = [_rule_classify(f) for f in all_feats]
    all_labels = [label_map[r[0]] for r in rule_results]

    model, explainer = None, None
    if _HAS_XGBOOST and len(all_feats) >= 4:
        # Train on the rule-labelled data (in production: use real labelled data)
        model, explainer = _train_xgboost_classifier(all_feats, all_labels)

    inv_label_map = {v: k for k, v in label_map.items()}

    for i, (tid, tname, feats, _attempts) in enumerate(topic_features):
        attempt_count = int(feats["attempt_count"])

        if model is not None and explainer is not None:
            feature_names = list(feats.keys())
            X_single = np.array([[feats[k] for k in feature_names]])
            pred = int(model.predict(X_single)[0])
            proba_arr = model.predict_proba(X_single)[0]
            prob = float(proba_arr[pred])
            error_type = inv_label_map.get(pred, ErrorType.CONCEPTUAL)

            # SHAP explanation
            shap_vals = explainer.shap_values(X_single)
            if isinstance(shap_vals, list):
                sv = shap_vals[pred][0]
            else:
                sv = shap_vals[0]
            top_feat_idx = int(np.argmax(np.abs(sv)))
            top_feat_name = feature_names[top_feat_idx]
            top_feat_val = feats[top_feat_name]
            explanation = (
                f"Classified as {error_type.value} (confidence {prob:.0%}). "
                f"Strongest signal: {top_feat_name} = {top_feat_val:.3f} "
                f"(SHAP impact: {sv[top_feat_idx]:+.3f})."
            )
            sub_type = rule_results[i][1]  # use rule sub-type
        else:
            error_type, sub_type, prob, explanation = rule_results[i]

        # Confidence tier
        tier = _compute_confidence_tier(prob, attempt_count)

        # OOD detection
        is_ood, ood_reason = _detect_ood(feats, all_feats, prob)
        if is_ood:
            tier = ConfidenceTier.UNCERTAIN  # downgrade if OOD

        diagnoses.append(ErrorDiagnosis(
            topic_id=tid,
            topic_name=tname,
            error_type=error_type,
            sub_type=sub_type,
            confidence=round(prob, 3),
            shap_explanation=explanation,
            features=feats,
            intervention_type=_get_intervention(error_type, sub_type),
            confidence_tier=tier,
            is_ood=is_ood,
            ood_reason=ood_reason,
        ))

    # Overall pattern
    type_counts = {}
    for d in diagnoses:
        type_counts[d.error_type.value] = type_counts.get(d.error_type.value, 0) + 1
    dominant = max(type_counts, key=type_counts.get) if type_counts else "unknown"
    overall = f"Dominant error pattern: {dominant} ({type_counts.get(dominant, 0)}/{len(diagnoses)} topics)."

    return ErrorProfile(
        student_id=student_id,
        diagnoses=diagnoses,
        overall_pattern=overall,
        cold_start=cold_start,
    )
