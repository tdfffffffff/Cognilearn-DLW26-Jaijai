"""
Voice-to-Text "Teach the AI" — Concept Gap Analysis.

Feynman Technique flow:
  1. Student speaks → transcription (Azure Speech or simulated)
  2. Keyword extraction from transcript
  3. Compare against topic concept map
  4. Coverage score + missing concept list
  5. Targeted feedback

Privacy: audio deleted post-transcription, transcript deleted post-extraction.
Only coverage_score + missing_concepts + feedback are saved.
"""

from __future__ import annotations

from .data import CONCEPT_MAPS, TOPICS, generate_voice_session
from .schemas import VoiceGapReport


def analyse_voice_session(
    student_id: str,
    topic_id: str,
    transcript: str | None = None,
) -> VoiceGapReport:
    """Run concept gap analysis on a voice session.

    If no real transcript is provided, uses synthetic data.
    """

    if transcript:
        # Real keyword extraction (would use GPT-4o in production)
        extracted = _extract_keywords(transcript, topic_id)
    else:
        # Synthetic data
        session = generate_voice_session(student_id, topic_id)
        return VoiceGapReport(
            topic_id=session["topic_id"],
            topic_name=session["topic_name"],
            extracted_keywords=session["extracted_keywords"],
            expected_keywords=session["expected_keywords"],
            missing_keywords=session["missing_keywords"],
            coverage_score=session["coverage_score"],
            feedback=_generate_feedback(
                session["topic_name"],
                session["extracted_keywords"],
                session["missing_keywords"],
                session["coverage_score"],
            ),
        )

    expected = CONCEPT_MAPS.get(topic_id, [])
    missing = [k for k in expected if k not in extracted]
    coverage = len(extracted) / max(len(expected), 1)
    topic_name = dict(TOPICS).get(topic_id, topic_id)

    return VoiceGapReport(
        topic_id=topic_id,
        topic_name=topic_name,
        extracted_keywords=extracted,
        expected_keywords=expected,
        missing_keywords=missing,
        coverage_score=round(coverage, 3),
        feedback=_generate_feedback(topic_name, extracted, missing, coverage),
    )


def _extract_keywords(transcript: str, topic_id: str) -> list[str]:
    """Extract concept keywords from transcript text.

    Simple keyword matching — in production, use GPT-4o structured extraction.
    """
    expected = CONCEPT_MAPS.get(topic_id, [])
    transcript_lower = transcript.lower()
    return [k for k in expected if k.lower() in transcript_lower]


def _generate_feedback(
    topic_name: str,
    mentioned: list[str],
    missing: list[str],
    coverage: float,
) -> str:
    """Generate targeted 2-sentence feedback."""

    if coverage >= 0.80:
        return (
            f"Strong understanding of {topic_name} — you covered "
            f"{len(mentioned)} of the key concepts. "
            f"To solidify: review {', '.join(missing[:2])} for complete mastery."
            if missing else
            f"Excellent! You covered all key concepts for {topic_name}. "
            f"Your explanation was comprehensive."
        )

    if coverage >= 0.50:
        return (
            f"Partial understanding of {topic_name} ({coverage:.0%} coverage). "
            f"You mentioned {', '.join(mentioned[:3])}, but missed critical concepts: "
            f"{', '.join(missing[:3])}. Focus your next study session on these gaps."
        )

    return (
        f"Significant gaps detected in {topic_name} ({coverage:.0%} coverage). "
        f"Missing foundational concepts: {', '.join(missing[:4])}. "
        f"Recommend a structured re-study of this topic before attempting practice problems."
    )
