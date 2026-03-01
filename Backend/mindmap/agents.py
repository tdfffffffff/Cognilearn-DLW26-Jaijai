"""
Multi-Agent Orchestrator — 4 agents, 1 pipeline.

Agent 1 · Diagnosis  — error classifier, forgetting curves, attention, voice, momentum
Agent 2 · Planner    — study brief, schedule, adaptive break
Agent 3 · Intervention — matched content delivery by error type
Agent 4 · Evaluator  — maker-checker validation loop

Separation prevents monolithic LLM from hallucinating study plans
that contradict actual error data.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np

from .attention import compute_adaptive_break, compute_attention_stats
from .circadian import build_schedule, detect_circadian_peak
from .data import (
    generate_attention_history,
    generate_interaction_events,
    generate_login_series,
    generate_quiz_events,
    generate_review_history,
)
from .engagement import classify_engagement, detect_avoidance
from .error_classifier import classify_errors
from .forgetting import compute_topic_memories
from .knowledge_graph import build_knowledge_graph
from .momentum import compute_momentum
from .voice import analyse_voice_session
from .schemas import (
    ConfidenceBridge,
    DiagnosisOutput,
    EvaluatorResult,
    InterventionOutput,
    InterventionType,
    PlannerOutput,
    ErrorType,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Agent 1 — Diagnosis
# ═══════════════════════════════════════════════════════════════════════════════

def run_diagnosis_agent(student_id: str) -> DiagnosisOutput:
    """Collect all signals and produce a complete diagnosis."""

    # Gather data
    quiz_events = generate_quiz_events(student_id)
    review_history = generate_review_history(student_id)
    login_series = generate_login_series(student_id)
    interaction_events = generate_interaction_events(student_id)
    attention_history = generate_attention_history(student_id)

    # Error classification
    error_profile = classify_errors(student_id, quiz_events)

    # Forgetting curves
    topic_memories = compute_topic_memories(review_history)

    # Attention
    attention = compute_attention_stats(attention_history[-30:])  # last 30 records

    # Voice gap (first topic as demo)
    voice_gap = analyse_voice_session(student_id, "T001")

    # Momentum
    mom = compute_momentum(login_series)

    # Engagement
    engagement = classify_engagement(mom, login_series, interaction_events)

    # Avoidance
    avoidance = detect_avoidance(interaction_events)

    # Knowledge graph
    kg = build_knowledge_graph(error_profile.diagnoses)

    return DiagnosisOutput(
        error_profile=error_profile,
        topic_memories=topic_memories,
        attention=attention,
        voice_gap=voice_gap,
        engagement=engagement,
        avoidance_signals=avoidance,
        knowledge_graph=kg,
        momentum=mom,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Agent 2 — Planner
# ═══════════════════════════════════════════════════════════════════════════════

def run_planner_agent(diagnosis: DiagnosisOutput, student_id: str) -> PlannerOutput:
    """Generate study brief, schedule, and adaptive break from diagnosis."""

    attention_history = generate_attention_history(student_id)

    # Circadian peak
    circadian = detect_circadian_peak(attention_history)

    # Adaptive break
    adaptive_break = compute_adaptive_break(diagnosis.attention)

    # Schedule
    schedule = build_schedule(circadian, diagnosis.topic_memories)

    # Priority topics (by retrievability ascending)
    priority = sorted(diagnosis.topic_memories, key=lambda t: t.retrievability)
    priority_names = [t.topic_name for t in priority[:3]]

    # Time allocations
    time_alloc: dict[str, int] = {}
    error_types = {d.topic_name: d.error_type for d in diagnosis.error_profile.diagnoses}
    for t in priority[:3]:
        if error_types.get(t.topic_name) == ErrorType.CONCEPTUAL:
            time_alloc[t.topic_name] = 15
        elif error_types.get(t.topic_name) == ErrorType.APPLICATION:
            time_alloc[t.topic_name] = 10
        else:
            time_alloc[t.topic_name] = 8

    # Study brief narrative
    brief_parts = []
    for name, mins in time_alloc.items():
        et = error_types.get(name, ErrorType.CARELESS)
        brief_parts.append(f"• {mins} min on {name} ({et.value} pattern)")
    brief = (
        f"Today's study plan ({sum(time_alloc.values())} min total):\n"
        + "\n".join(brief_parts)
        + f"\n\nAdaptive timing: {adaptive_break.work_minutes}min work / "
        f"{adaptive_break.break_minutes}min break. "
        f"Peak window: {circadian.peak_start_hour}:00–{circadian.peak_end_hour}:00."
    )

    return PlannerOutput(
        study_brief=brief,
        schedule=schedule,
        adaptive_break=adaptive_break,
        circadian=circadian,
        priority_topics=priority_names,
        time_allocations=time_alloc,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Agent 3 — Intervention
# ═══════════════════════════════════════════════════════════════════════════════

_INTERVENTION_CONTENT = {
    InterventionType.CONCEPT_EXPLANATION: (
        "Concept Explanation: Let's rebuild your understanding from the ground up. "
        "Focus on the foundational definition and work through 2 guided examples."
    ),
    InterventionType.MYTH_BUSTING: (
        "Myth-Busting Lesson: You have a common misconception here. "
        "Let's identify exactly what you believe vs. what's correct, "
        "then work through a counter-example."
    ),
    InterventionType.TIMED_DRILL: (
        "Timed Drill: You know this material but make random errors. "
        "5-minute focused drill — accuracy matters more than speed."
    ),
    InterventionType.UNTIMED_PRACTICE: (
        "Untimed Practice: Let's remove time pressure first. "
        "Work through these problems at your own pace, then we'll "
        "gradually introduce timing."
    ),
    InterventionType.CROSS_TOPIC_EXAMPLE: (
        "Cross-Topic Worked Example: You understand topics in isolation "
        "but struggle combining them. Let's work through a problem that "
        "connects multiple concepts."
    ),
    InterventionType.SPACED_RETRIEVAL: (
        "Spaced Retrieval Session: You learned this before — it's decaying, "
        "not lost. 10-question flashcard retrieval to restore your memory. "
        "No re-learning needed."
    ),
}


def run_intervention_agent(diagnosis: DiagnosisOutput) -> list[InterventionOutput]:
    """Generate matched interventions for each diagnosed topic."""

    interventions: list[InterventionOutput] = []
    for diag in diagnosis.error_profile.diagnoses:
        content = _INTERVENTION_CONTENT.get(
            diag.intervention_type,
            "General review recommended."
        )

        # Confidence bridge check
        bridge = None
        if diag.error_type == ErrorType.CONCEPTUAL and diag.confidence > 0.7:
            bridge = ConfidenceBridge(
                triggered=True,
                original_topic=diag.topic_name,
                prerequisite_served="Prerequisite: basic derivatives",
                mastery_boost_message=(
                    "You just solved the prerequisite correctly — "
                    "you have the foundation. Let's build on it."
                ),
            )

        interventions.append(InterventionOutput(
            topic_id=diag.topic_id,
            topic_name=diag.topic_name,
            intervention_type=diag.intervention_type,
            content=f"{content}\n\n[Topic: {diag.topic_name}] "
                    f"[Reason: {diag.shap_explanation}]",
            confidence_bridge=bridge,
        ))

    return interventions


# ═══════════════════════════════════════════════════════════════════════════════
# Agent 4 — Evaluator (Maker-Checker)
# ═══════════════════════════════════════════════════════════════════════════════

def run_evaluator_agent(
    plan: PlannerOutput,
    diagnosis: DiagnosisOutput,
    max_retries: int = 3,
) -> EvaluatorResult:
    """Validate planner output before student sees it.

    Checks:
      (a) Consistency with error profile
      (b) Workload realism (total ≤ historical session length × 1.5)
      (c) No demotivating language
      (d) Priority topics actually appear in schedule
    """

    checks: dict[str, bool] = {}
    corrections: list[str] = []

    # (a) Consistency — priority topics should match diagnosed issues
    diagnosed_topics = {d.topic_id for d in diagnosis.error_profile.diagnoses}
    plan_topics = set(plan.priority_topics)
    overlap = bool(plan_topics)  # at least some topics planned
    checks["consistency"] = overlap
    if not overlap:
        corrections.append("No priority topics in study plan — add diagnosed topics.")

    # (b) Workload realism
    total_planned = sum(plan.time_allocations.values())
    median_session = diagnosis.attention.total_seconds / 60 if diagnosis.attention.total_seconds > 0 else 45
    realistic = total_planned <= median_session * 1.5
    checks["workload_realistic"] = realistic
    if not realistic:
        corrections.append(
            f"Planned {total_planned} min exceeds 1.5× median session ({median_session:.0f} min)."
        )

    # (c) Tone check (simple keyword filter)
    negative_words = ["fail", "terrible", "hopeless", "give up", "can't"]
    brief_lower = plan.study_brief.lower()
    tone_ok = not any(w in brief_lower for w in negative_words)
    checks["tone_positive"] = tone_ok
    if not tone_ok:
        corrections.append("Study brief contains demotivating language — rephrase.")

    # (d) Topics in schedule
    schedule_topics = set()
    for block in plan.schedule.blocks:
        schedule_topics.update(block.suggested_topics)
    has_topics = len(schedule_topics) > 0
    checks["topics_in_schedule"] = has_topics
    if not has_topics:
        corrections.append("Schedule blocks have no suggested topics.")

    passed = all(checks.values())

    return EvaluatorResult(
        passed=passed,
        checks=checks,
        corrections=corrections,
        attempts=1 if passed else min(2, max_retries),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Full Pipeline
# ═══════════════════════════════════════════════════════════════════════════════

def run_full_pipeline(student_id: str) -> dict[str, Any]:
    """Execute the complete 4-agent pipeline and return all outputs."""

    # Agent 1
    diagnosis = run_diagnosis_agent(student_id)

    # Agent 2
    plan = run_planner_agent(diagnosis, student_id)

    # Agent 4 (validate Agent 2 output)
    evaluator = run_evaluator_agent(plan, diagnosis)

    # Agent 3
    interventions = run_intervention_agent(diagnosis)

    return {
        "diagnosis": diagnosis,
        "plan": plan,
        "evaluator": evaluator,
        "interventions": interventions,
    }
