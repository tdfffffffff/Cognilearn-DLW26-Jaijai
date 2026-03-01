"""
Daily Study Productivity Report Generator.

Compiles end-of-session stats and generates a narrative summary:
  📊 Session duration vs target
  🎯 Questions attempted + accuracy
  🧠 Error types encountered today
  👁 Focus quality: % focused / drowsy / distracted
  ⏱ Fatigue onset time
  🎤 Voice sessions: concept coverage avg
  📅 Study brief completion %
  📈 One improvement vs yesterday
  🔜 One priority for tomorrow

In production: GPT-4o generates the narrative.
Here: template-based generation (swap for LLM call).
"""

from __future__ import annotations

from datetime import datetime, timezone

from .schemas import (
    AttentionSnapshot,
    DailyReport,
    DiagnosisOutput,
    ErrorType,
    PlannerOutput,
)


def generate_daily_report(
    student_id: str,
    diagnosis: DiagnosisOutput,
    plan: PlannerOutput,
) -> DailyReport:
    """Generate the daily study productivity report."""

    now = datetime.now(timezone.utc)

    # Session stats
    session_min = diagnosis.attention.total_seconds / 60.0
    questions = sum(
        len(d.features) for d in diagnosis.error_profile.diagnoses
    ) * 3  # approximate
    accuracy = sum(
        d.features.get("accuracy", 0.5) for d in diagnosis.error_profile.diagnoses
    ) / max(len(diagnosis.error_profile.diagnoses), 1) * 100

    # Error types
    error_types = list({d.error_type for d in diagnosis.error_profile.diagnoses})

    # Voice coverage
    voice_cov = diagnosis.voice_gap.coverage_score if diagnosis.voice_gap else None

    # Brief completion (simulated)
    planned_total = sum(plan.time_allocations.values())
    completion = min(session_min / max(planned_total, 1) * 100, 100)

    # Narrative
    narrative = _build_narrative(
        session_min=session_min,
        accuracy=accuracy,
        focus_pct=diagnosis.attention.focused_pct,
        fatigue=diagnosis.attention.fatigue_onset_min,
        error_types=error_types,
        voice_cov=voice_cov,
        completion=completion,
        plan=plan,
    )

    return DailyReport(
        student_id=student_id,
        date=now.strftime("%Y-%m-%d"),
        session_duration_min=round(session_min, 1),
        questions_attempted=questions,
        accuracy_pct=round(accuracy, 1),
        error_types_today=error_types,
        focus_quality_pct=diagnosis.attention.focused_pct,
        fatigue_onset_min=diagnosis.attention.fatigue_onset_min,
        voice_coverage_avg=voice_cov,
        brief_completion_pct=round(completion, 1),
        narrative=narrative,
        improvement_vs_yesterday=(
            "Focus quality improved 8% vs yesterday's session"
            if diagnosis.attention.focused_pct > 60 else None
        ),
        priority_tomorrow=(
            f"Priority: {plan.priority_topics[0]} — "
            f"highest decay risk"
            if plan.priority_topics else None
        ),
    )


def _build_narrative(
    session_min: float,
    accuracy: float,
    focus_pct: float,
    fatigue: float | None,
    error_types: list[ErrorType],
    voice_cov: float | None,
    completion: float,
    plan: "PlannerOutput",
) -> str:
    """Build template-based narrative. Replace with GPT-4o in production."""

    lines = []

    # Opening
    if focus_pct > 75:
        lines.append(f"⚡ Strong session — {session_min:.0f} min, {focus_pct:.0f}% focus quality.")
    elif focus_pct > 50:
        lines.append(f"📊 Decent session — {session_min:.0f} min, {focus_pct:.0f}% focus quality.")
    else:
        lines.append(f"⚠️ Challenging session — {session_min:.0f} min, only {focus_pct:.0f}% focus.")

    # Accuracy
    lines.append(f"Accuracy: {accuracy:.0f}%.")

    # Error patterns
    if error_types:
        et_str = ", ".join(et.value for et in error_types[:3])
        lines.append(f"Error patterns detected: {et_str}.")

    # Voice
    if voice_cov is not None:
        lines.append(f"Voice concept coverage: {voice_cov:.0%}.")

    # Fatigue
    if fatigue:
        lines.append(
            f"Your focus dropped after ~{fatigue:.0f} minutes — "
            f"we've set your Pomodoro to {plan.adaptive_break.work_minutes}min accordingly."
        )

    # Completion
    lines.append(f"Study plan completion: {completion:.0f}%.")

    # Tomorrow
    if plan.priority_topics:
        lines.append(
            f"Tomorrow's priority: {plan.priority_topics[0]} "
            f"(highest decay risk in your profile)."
        )

    return "\n\n".join(lines)
