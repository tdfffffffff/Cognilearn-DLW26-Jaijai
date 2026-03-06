"""
Voice-to-Text "Teach the AI" — Concept Gap Analysis with OpenAI.

Feynman Technique flow:
  1. Student speaks → transcription via Web Speech API (frontend)
  2. Transcript sent to backend
  3. OpenAI GPT-4o analyses: correct parts, missing parts, wrong parts
  4. Returns structured analysis with original student sentences annotated
  5. Coverage score + detailed feedback

Privacy: audio never leaves the browser (Web Speech API).
Only transcript + analysis results are processed; transcript deleted post-analysis.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from openai import OpenAI
from dotenv import load_dotenv

from .data import CONCEPT_MAPS, TOPICS, generate_voice_session
from .schemas import VoiceGapReport, VoiceUnderstandingAnalysis, SentenceAnalysis

load_dotenv()

_client: Optional[OpenAI] = None


def _get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OpenAI_KEY") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OpenAI API key not found in environment variables")
        _client = OpenAI(api_key=api_key)
    return _client


def analyse_understanding(
    transcript: str,
    topic: str,
    materials_context: str | None = None,
) -> VoiceUnderstandingAnalysis:
    """Use OpenAI to deeply analyse a student's spoken explanation.

    Returns:
      - Sentence-by-sentence analysis (correct / partially correct / incorrect)
      - Missing concepts the student didn't mention
      - Overall accuracy score
      - Constructive feedback
    """
    client = _get_openai_client()

    system_prompt = f"""You are an expert tutor analysing a student's verbal explanation of the topic: "{topic}".

IMPORTANT: Focus ONLY on conceptual understanding and mathematical/scientific accuracy.
Do NOT comment on grammar, spelling, sentence structure, or language fluency.
The student may be speaking informally — that is fine. Only assess the IDEAS and CONCEPTS.

Your task:
1. Break the student's transcript into individual sentences/claims.
2. For each sentence, determine if it is:
   - "correct": The statement is factually and conceptually accurate
   - "partially_correct": Contains some truth but has conceptual inaccuracies or imprecisions
   - "incorrect": The statement is wrong or reflects a misconception
3. For each sentence, provide a brief explanation of why the concept is correct/incorrect.
4. List important concepts about "{topic}" that the student MISSED (did not mention at all).
5. Give an overall accuracy percentage (0-100) based on conceptual understanding.
6. Provide constructive feedback focusing on strengthening conceptual understanding.
   Use LaTeX notation ($...$) for any mathematical expressions.

{f'Reference materials for accuracy checking: {materials_context}' if materials_context else ''}

Respond in this exact JSON format:
{{
  "sentences": [
    {{
      "original": "the exact sentence from the student",
      "verdict": "correct" | "partially_correct" | "incorrect",
      "explanation": "why this is correct/incorrect",
      "correction": "the corrected version if incorrect, null if correct"
    }}
  ],
  "missing_concepts": ["concept1", "concept2", ...],
  "overall_accuracy": 75,
  "feedback": "Overall feedback paragraph",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Student's explanation:\n\n{transcript}"},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)

        sentences = [
            SentenceAnalysis(
                original=s["original"],
                verdict=s["verdict"],
                explanation=s["explanation"],
                correction=s.get("correction"),
            )
            for s in result.get("sentences", [])
        ]

        return VoiceUnderstandingAnalysis(
            topic=topic,
            transcript=transcript,
            sentences=sentences,
            missing_concepts=result.get("missing_concepts", []),
            overall_accuracy=result.get("overall_accuracy", 0),
            feedback=result.get("feedback", ""),
            strengths=result.get("strengths", []),
            weaknesses=result.get("weaknesses", []),
        )

    except Exception as e:
        # Fallback: return a basic analysis if OpenAI fails
        return VoiceUnderstandingAnalysis(
            topic=topic,
            transcript=transcript,
            sentences=[
                SentenceAnalysis(
                    original=transcript,
                    verdict="partially_correct",
                    explanation=f"Could not fully analyse: {str(e)}",
                    correction=None,
                )
            ],
            missing_concepts=[],
            overall_accuracy=50,
            feedback=f"Analysis could not be completed fully. Error: {str(e)}",
            strengths=[],
            weaknesses=[],
        )


def analyse_voice_session(
    student_id: str,
    topic_id: str,
    transcript: str | None = None,
) -> VoiceGapReport:
    """Run concept gap analysis on a voice session.

    If no real transcript is provided, uses synthetic data.
    """

    if transcript:
        extracted = _extract_keywords(transcript, topic_id)
    else:
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


def generate_quiz_from_materials(
    topic: str,
    materials_text: str,
    num_questions: int = 5,
) -> list[dict]:
    """Generate quiz questions from uploaded study materials using OpenAI."""
    client = _get_openai_client()

    system_prompt = f"""You are an expert tutor creating quiz questions for the topic: "{topic}".
Based on the provided study materials, generate {num_questions} conceptual questions.
Each question should test deep understanding, not just memorization.

For each question, also note which part of the source material it references.

Respond in this exact JSON format:
{{
  "questions": [
    {{
      "question": "the question text",
      "answer": "the model answer",
      "difficulty": "easy" | "medium" | "hard",
      "source_reference": "the relevant excerpt from the materials",
      "related_concepts": ["concept1", "concept2"],
      "hints": ["hint1"]
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Study materials:\n\n{materials_text}"},
            ],
            temperature=0.5,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        return result.get("questions", [])
    except Exception as e:
        return [{"question": f"Error generating questions: {e}", "answer": "", "difficulty": "medium",
                 "source_reference": "", "related_concepts": [], "hints": []}]


def chat_with_tutor(
    message: str,
    topic: str,
    conversation_history: list[dict] | None = None,
    materials_context: str | None = None,
) -> str:
    """Have a conversational exchange with the AI tutor (Ask Mode)."""
    client = _get_openai_client()

    system_prompt = f"""You are a patient, expert tutor helping a student understand "{topic}".
Be conversational, encouraging, and clear. Use analogies when helpful.
If the student is confused, break concepts down step by step.
Focus on conceptual understanding and mathematical reasoning — do NOT correct grammar or spelling.
Use LaTeX notation ($...$ for inline, $$...$$ for display) for all mathematical expressions.
Keep responses concise (2-4 paragraphs max).
{f'Reference materials: {materials_context}' if materials_context else ''}"""

    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": message})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=800,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Sorry, I couldn't process your question right now. Error: {str(e)}"


def assess_quiz_answer(
    question: str,
    student_answer: str,
    topic: str,
    image_base64: str | None = None,
    materials_context: str | None = None,
) -> dict:
    """Assess a student's quiz answer and classify errors into 6 cognitive categories.

    Categories: Conceptual, Procedural, Factual, Metacognitive, Transfer, Application.
    Supports text answers and image-based answers (handwritten work via OpenAI Vision).
    All mathematical content is returned in LaTeX format.

    Returns dict with: assessment, error_classifications, score, feedback, latex_solution.
    """
    client = _get_openai_client()

    system_prompt = f"""You are an expert mathematics tutor and learning diagnostician.
The student is studying "{topic}".

Assess the student's answer to the given question. Provide:

1. **assessment**: A detailed evaluation of the student's work. Use LaTeX notation for ALL math
   (wrap inline math in $...$ and display math in $$...$$).

2. **score**: A numerical score from 0 to 100 representing overall correctness.

3. **error_classifications**: Classify any errors into EXACTLY these 6 cognitive error categories.
   For each category, provide a score from 0 to 100 (100 = no errors in this category = strength):
   - "Conceptual": Does the student understand the underlying concepts/principles?
   - "Procedural": Does the student follow correct mathematical procedures/algorithms?
   - "Factual": Does the student recall correct facts, formulas, and definitions?
   - "Metacognitive": Does the student show awareness of their own thinking and self-monitor?
   - "Transfer": Can the student apply learned concepts to new/different contexts?
   - "Application": Can the student apply math to real-world or practical problems?

4. **errors_found**: Array of specific errors found, each with:
   - "category": one of the 6 categories above
   - "description": what the error is (use LaTeX for math)
   - "correction": the correct approach (use LaTeX for math)

5. **feedback**: Encouraging, constructive feedback focusing on conceptual understanding.
   Use LaTeX for any math. Do NOT focus on grammar or spelling.

6. **latex_solution**: The complete correct solution written in LaTeX format.

{f'Reference materials: {materials_context}' if materials_context else ''}

Respond in this exact JSON format:
{{
  "assessment": "detailed assessment text with $LaTeX$",
  "score": 85,
  "error_classifications": [
    {{"type": "Conceptual", "score": 90}},
    {{"type": "Procedural", "score": 70}},
    {{"type": "Factual", "score": 95}},
    {{"type": "Metacognitive", "score": 60}},
    {{"type": "Transfer", "score": 75}},
    {{"type": "Application", "score": 80}}
  ],
  "errors_found": [
    {{"category": "Procedural", "description": "error description", "correction": "correction"}}
  ],
  "feedback": "constructive feedback",
  "latex_solution": "$$complete solution$$"
}}"""

    # Build user message content
    user_content = []

    # If an image is provided, use vision API
    if image_base64:
        user_content.append({
            "type": "text",
            "text": f"Question: {question}\n\nThe student submitted an image of their handwritten work. Please read, interpret, and assess their solution.",
        })
        user_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
        })
    else:
        user_content.append({
            "type": "text",
            "text": f"Question: {question}\n\nStudent's answer:\n{student_answer}",
        })

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=2000,
        )
        result = json.loads(response.choices[0].message.content)

        # Ensure all 6 categories are present
        categories = ["Conceptual", "Procedural", "Factual", "Metacognitive", "Transfer", "Application"]
        existing = {c["type"] for c in result.get("error_classifications", [])}
        for cat in categories:
            if cat not in existing:
                result.setdefault("error_classifications", []).append({"type": cat, "score": 50})

        return result
    except Exception as e:
        return {
            "assessment": f"Error assessing answer: {str(e)}",
            "score": 0,
            "error_classifications": [
                {"type": "Conceptual", "score": 50},
                {"type": "Procedural", "score": 50},
                {"type": "Factual", "score": 50},
                {"type": "Metacognitive", "score": 50},
                {"type": "Transfer", "score": 50},
                {"type": "Application", "score": 50},
            ],
            "errors_found": [],
            "feedback": f"Could not assess the answer: {str(e)}",
            "latex_solution": "",
        }


def generate_quiz_questions(
    topic: str,
    num_questions: int = 5,
    materials_context: str | None = None,
) -> list[dict]:
    """Generate text-based quiz questions for a given topic.

    Unlike generate_quiz_from_materials which requires uploaded materials,
    this can generate questions from the topic name alone with optional materials.
    All questions include LaTeX-formatted math content.
    """
    client = _get_openai_client()

    system_prompt = f"""You are an expert mathematics tutor creating quiz questions for: "{topic}".
Generate {num_questions} questions that test deep understanding.
Use LaTeX notation for ALL mathematical content (wrap inline math in $...$ and display math in $$...$$).
Include a mix of difficulty levels.

{f'Optional reference materials: {materials_context}' if materials_context else 'Generate questions based on your knowledge of this topic.'}

Respond in this exact JSON format:
{{
  "questions": [
    {{
      "id": "q1",
      "question": "question text with $LaTeX$ math",
      "correct_answer": "correct answer with $LaTeX$",
      "difficulty": "easy" | "medium" | "hard",
      "hints": ["hint1 with $LaTeX$"],
      "topic_area": "specific sub-topic"
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate {num_questions} quiz questions for {topic}"},
            ],
            temperature=0.6,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        return result.get("questions", [])
    except Exception as e:
        return [{"id": "q1", "question": f"Error generating questions: {e}",
                 "correct_answer": "", "difficulty": "medium", "hints": [], "topic_area": topic}]


def _extract_keywords(transcript: str, topic_id: str) -> list[str]:
    """Extract concept keywords from transcript text."""
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


# ═══════════════════════════════════════════════════════════════════════════════
# Emergency Flashcard Generation
# ═══════════════════════════════════════════════════════════════════════════════

def generate_emergency_flashcards(
    topic: str,
    num_cards: int = 10,
    materials_context: str | None = None,
) -> list[dict]:
    """Generate emergency revision flashcards using OpenAI.

    Each flashcard has:
      - title: Short concept name label
      - front: A question or title about the concept (shown on front of card)
      - back: Brief explanation / intuition (shown on back of card)
      - detailedExplanation: Full detailed explanation for "Explain" button
      - importance: critical / important / supplementary
      - category: theorem / concept / formula / intuition / definition
    """
    client = _get_openai_client()

    system_prompt = f"""You are an expert tutor creating emergency revision flashcards for the topic: "{topic}".

The student has an exam very soon and needs to quickly review the most important concepts.

Create exactly {num_cards} flashcards. For each flashcard provide:
- "title": A SHORT concept name (2-6 words), e.g. "Eigenvalues & Eigenvectors", "Chain Rule", "Bayes' Theorem"
- "front": A question or prompt about the concept that tests the student's recall, e.g. "What is the Chain Rule and when do you use it?", "State Bayes' Theorem and explain each term." This MUST be different from the title — it should be a question or challenge.
- "back": A BRIEF explanation or intuition (2-3 sentences) that helps the student understand the concept. This is the quick answer. Use LaTeX ($...$) for math.
- "detailedExplanation": A FULL, detailed explanation (5-10 sentences) with **bold** markdown for key terms. Include worked examples, common mistakes to avoid, and deeper intuition. This is shown when the student clicks "Explain".
- "importance": "critical" (must know), "important" (good to know), or "supplementary" (nice to know)
- "category": one of "theorem", "concept", "formula", "intuition", "definition"

{f'Use these study materials as reference: {materials_context}' if materials_context else ''}

IMPORTANT RULES:
1. "front" must be a QUESTION or PROMPT — NOT the same as "title"
2. "back" must be a BRIEF answer (2-3 sentences) — NOT a full explanation
3. "detailedExplanation" is the FULL detailed explanation — much longer than "back"
4. Order cards by importance (critical first)

Respond in this exact JSON format:
{{
  "flashcards": [
    {{
      "title": "Chain Rule",
      "front": "What is the Chain Rule and how do you apply it to composite functions?",
      "back": "The Chain Rule states that the derivative of $f(g(x))$ is $f'(g(x)) \\cdot g'(x)$. Think of it as peeling an onion — differentiate the outer layer, then multiply by the derivative of the inner layer.",
      "detailedExplanation": "The **Chain Rule** is used when differentiating **composite functions**...",
      "importance": "critical",
      "category": "formula"
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate {num_cards} emergency flashcards for: {topic}"},
            ],
            temperature=0.5,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        cards = result.get("flashcards", [])

        # Normalise and add IDs
        for i, card in enumerate(cards):
            card["id"] = f"fc-{i+1}"
            # Ensure front exists; fall back to title if AI didn't provide it
            if not card.get("front") or card["front"] == card.get("title"):
                card["front"] = f"What is {card.get('title', f'Concept {i+1}')} and why does it matter?"
            card.setdefault("importance", "important")
            card.setdefault("category", "concept")

        return cards

    except Exception as e:
        # Return a minimal fallback set
        return [
            {
                "id": "fc-err-1",
                "title": f"Key Concept in {topic}",
                "front": f"What is the most important concept in {topic}?",
                "back": f"Review the core definitions and theorems of {topic}.",
                "detailedExplanation": f"Could not generate flashcards: {str(e)}. Review your notes for {topic}.",
                "importance": "critical",
                "category": "concept",
            }
        ]
