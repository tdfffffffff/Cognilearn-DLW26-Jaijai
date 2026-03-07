"""
FastAPI Application — MindMap v2 Complete.

All endpoints:
  GET  /student/{student_id}/dashboard     — Full 4-agent pipeline
  GET  /student/{student_id}/diagnose      — Error classification only
  GET  /student/{student_id}/temporal      — Forgetting curves + momentum
  GET  /student/{student_id}/attention     — Attention stats + adaptive break
  GET  /student/{student_id}/knowledge-graph — Knowledge graph with risk
  POST /student/{student_id}/voice/{topic_id} — Voice concept gap analysis
  GET  /student/{student_id}/report        — Daily study report
  GET  /student/{student_id}/privacy       — Data transparency (My Data page)
  DELETE /student/{student_id}/privacy     — Purge all student data
  PUT  /student/{student_id}/privacy/auto-delete — Configure auto-delete
  GET  /student/{student_id}/data-export   — Export all data as JSON
  GET  /demo/aisha                         — Demo profile: Aisha
  GET  /demo/marcus                        — Demo profile: Marcus
  GET  /health                             — Health check
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Path, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .agents import (
    run_diagnosis_agent,
    run_full_pipeline,
    run_intervention_agent,
    run_planner_agent,
    run_evaluator_agent,
)
from .attention import compute_adaptive_break, compute_attention_stats
from .circadian import build_schedule, detect_circadian_peak
from .data import (
    DEMO_STUDENTS,
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
from .privacy import (
    export_student_data,
    get_stored_data,
    purge_student_data,
    set_auto_delete,
)
from .report import generate_daily_report
from .schemas import StudentDashboard
from .voice import analyse_voice_session, analyse_understanding, generate_quiz_from_materials, chat_with_tutor, assess_quiz_answer, generate_quiz_questions, generate_emergency_flashcards


# ═══════════════════════════════════════════════════════════════════════════════
# App setup
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="MindMap v2 — Cognitive Learning Analytics",
    version="2.0.0",
    description=(
        "5-feature cognitive learning platform: Error Classification (XGBoost+SHAP), "
        "Voice-to-Text concept gap analysis, Eye Tracking attention monitor, "
        "Daily Study Report, and Privacy-first architecture. "
        "Powered by a 4-agent pipeline (Diagnosis → Planner → Evaluator → Intervention)."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# Full dashboard (all 4 agents)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/student/{student_id}/dashboard", response_model=StudentDashboard,
         summary="Complete student dashboard — all 4 agents")
async def student_dashboard(
    student_id: str = Path(..., min_length=1),
):
    """Execute the full 4-agent pipeline and return the complete dashboard."""
    result = run_full_pipeline(student_id)

    daily_report = generate_daily_report(
        student_id, result["diagnosis"], result["plan"]
    )
    privacy = get_stored_data(student_id)

    return StudentDashboard(
        student_id=student_id,
        generated_at=datetime.now(timezone.utc),
        diagnosis=result["diagnosis"],
        plan=result["plan"],
        interventions=result["interventions"],
        daily_report=daily_report,
        privacy=privacy,
        evaluator=result["evaluator"],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 1: Error Classification
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/student/{student_id}/diagnose",
         summary="Error classification — 4 cognitive types")
async def diagnose(student_id: str = Path(...)):
    quiz_events = generate_quiz_events(student_id)
    profile = classify_errors(student_id, quiz_events)
    return profile


# ═══════════════════════════════════════════════════════════════════════════════
# Temporal: Forgetting curves + Momentum + Engagement
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/student/{student_id}/temporal",
         summary="Forgetting curves, GRU momentum, engagement")
async def temporal_state(student_id: str = Path(...)):
    review_history = generate_review_history(student_id)
    login_series = generate_login_series(student_id)
    interactions = generate_interaction_events(student_id)

    memories = compute_topic_memories(review_history)
    mom = compute_momentum(login_series)
    engagement = classify_engagement(mom, login_series, interactions)
    avoidance = detect_avoidance(interactions)

    return {
        "student_id": student_id,
        "topic_memories": [m.model_dump() for m in memories],
        "momentum": mom.model_dump(),
        "engagement": engagement.model_dump(),
        "avoidance_signals": [a.model_dump() for a in avoidance],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 3: Attention + Adaptive Break
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/student/{student_id}/attention",
         summary="Attention stats + adaptive Pomodoro")
async def attention(student_id: str = Path(...)):
    history = generate_attention_history(student_id)
    stats = compute_attention_stats(history[-30:])
    brk = compute_adaptive_break(stats)
    return {"attention": stats.model_dump(), "adaptive_break": brk.model_dump()}


# ═══════════════════════════════════════════════════════════════════════════════
# Knowledge Graph
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/student/{student_id}/knowledge-graph",
         summary="Knowledge graph with risk propagation")
async def knowledge_graph(student_id: str = Path(...)):
    quiz_events = generate_quiz_events(student_id)
    profile = classify_errors(student_id, quiz_events)
    kg = build_knowledge_graph(profile.diagnoses)
    return kg.model_dump()


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 2: Voice-to-Text
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/student/{student_id}/voice/{topic_id}",
          summary="Voice concept gap analysis")
async def voice_analysis(
    student_id: str = Path(...),
    topic_id: str = Path(...),
    transcript: Optional[str] = Body(None, description="Raw transcript text (optional)"),
):
    report = analyse_voice_session(student_id, topic_id, transcript)
    return report.model_dump()


@app.post("/voice/analyze-understanding",
          summary="OpenAI-powered understanding analysis of student speech")
async def analyze_voice_understanding(
    transcript: str = Body(..., embed=True, description="Student's spoken transcript"),
    topic: str = Body(..., embed=True, description="Topic being explained"),
    materials_context: Optional[str] = Body(None, embed=True, description="Optional uploaded materials for reference"),
):
    """Analyse a student's spoken explanation using OpenAI.

    Returns sentence-by-sentence analysis with correct/incorrect/missing parts.
    """
    analysis = analyse_understanding(transcript, topic, materials_context)
    return analysis.model_dump()


@app.post("/quiz/generate-from-materials",
          summary="Generate quiz questions from uploaded study materials")
async def generate_quiz(
    topic: str = Body(..., embed=True),
    materials_text: str = Body(..., embed=True),
    num_questions: int = Body(5, embed=True),
    difficulty: Optional[str] = Body(None, embed=True),
):
    """Generate conceptual quiz questions from uploaded study materials, with source references."""
    questions = generate_quiz_from_materials(topic, materials_text, num_questions, difficulty)
    return {"topic": topic, "questions": questions}


@app.post("/chat/tutor",
          summary="Conversational AI tutor (Ask Mode)")
async def chat_tutor(
    message: str = Body(..., embed=True),
    topic: str = Body(..., embed=True),
    conversation_history: Optional[list[dict]] = Body(None, embed=True),
    materials_context: Optional[str] = Body(None, embed=True),
):
    """Have a conversation with an AI tutor about a topic."""
    reply = chat_with_tutor(message, topic, conversation_history, materials_context)
    return {"reply": reply}


# ═══════════════════════════════════════════════════════════════════════════════
# Quiz Mode: Text-based assessment with image support & error classification
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/quiz/generate-questions",
          summary="Generate text-based quiz questions for a topic")
async def generate_questions(
    topic: str = Body(..., embed=True),
    num_questions: int = Body(5, embed=True),
    materials_context: Optional[str] = Body(None, embed=True),
    difficulty: Optional[str] = Body(None, embed=True),
):
    """Generate AI-powered quiz questions with LaTeX math content."""
    questions = generate_quiz_questions(topic, num_questions, materials_context, difficulty)
    return {"topic": topic, "questions": questions}


@app.post("/quiz/assess-answer",
          summary="Assess student answer and classify errors into 6 cognitive categories")
async def quiz_assess_answer(
    question: str = Body(..., embed=True),
    student_answer: str = Body("", embed=True),
    topic: str = Body(..., embed=True),
    image_base64: Optional[str] = Body(None, embed=True),
    materials_context: Optional[str] = Body(None, embed=True),
):
    """Assess a student's quiz answer (text or image of handwritten work).

    Uses OpenAI GPT-4o-mini (with Vision for images) to:
    - Evaluate correctness
    - Classify errors into 6 cognitive categories:
      Conceptual, Procedural, Factual, Metacognitive, Transfer, Application
    - Return LaTeX-formatted solution and feedback
    """
    result = assess_quiz_answer(
        question=question,
        student_answer=student_answer,
        topic=topic,
        image_base64=image_base64,
        materials_context=materials_context,
    )
    return result


@app.post("/quiz/emergency-flashcards",
          summary="Generate emergency revision flashcards for rapid pre-exam study")
async def emergency_flashcards(
    topic: str = Body(..., embed=True),
    num_cards: int = Body(10, embed=True),
    materials_context: Optional[str] = Body(None, embed=True),
):
    """Generate AI-powered emergency flashcards for rapid revision.

    Each card has a short concept title (front) and full explanation (back),
    plus a detailed explanation for the 'Explain' button.
    """
    cards = generate_emergency_flashcards(topic, num_cards, materials_context)
    return {"topic": topic, "flashcards": cards}


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 4: Daily Report
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/student/{student_id}/report",
         summary="Daily study productivity report")
async def daily_report(student_id: str = Path(...)):
    result = run_full_pipeline(student_id)
    report = generate_daily_report(student_id, result["diagnosis"], result["plan"])
    return report.model_dump()


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 5: Privacy
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/student/{student_id}/privacy",
         summary="Data transparency — My Data page")
async def privacy_summary(student_id: str = Path(...)):
    return get_stored_data(student_id).model_dump()


@app.delete("/student/{student_id}/privacy",
            summary="Purge all student data (GDPR)")
async def privacy_purge(student_id: str = Path(...)):
    result = purge_student_data(student_id)
    return result.model_dump()


@app.put("/student/{student_id}/privacy/auto-delete",
         summary="Configure auto-delete period")
async def privacy_auto_delete(
    student_id: str = Path(...),
    days: int = Query(30, description="Auto-delete period: 7, 30, or 90 days"),
):
    return set_auto_delete(student_id, days)


@app.get("/student/{student_id}/data-export",
         summary="Export all data as JSON (GDPR)")
async def data_export(student_id: str = Path(...)):
    return export_student_data(student_id)


# ═══════════════════════════════════════════════════════════════════════════════
# Demo profiles
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/demo/{profile_name}",
         summary="Demo student profiles (aisha / marcus)")
async def demo_profile(profile_name: str = Path(...)):
    if profile_name.lower() not in DEMO_STUDENTS:
        return JSONResponse(
            status_code=404,
            content={"error": f"Profile '{profile_name}' not found. Use 'aisha' or 'marcus'."},
        )
    profile = DEMO_STUDENTS[profile_name.lower()]
    student_id = profile["id"]

    result = run_full_pipeline(student_id)
    report = generate_daily_report(student_id, result["diagnosis"], result["plan"])

    return {
        "profile": profile,
        "dashboard": StudentDashboard(
            student_id=student_id,
            generated_at=datetime.now(timezone.utc),
            diagnosis=result["diagnosis"],
            plan=result["plan"],
            interventions=result["interventions"],
            daily_report=report,
            privacy=get_stored_data(student_id),
            evaluator=result["evaluator"],
        ).model_dump(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Health
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "features": [
            "error_classification",
            "voice_concept_gap",
            "eye_tracking_attention",
            "daily_report",
            "privacy_management",
        ],
        "agents": ["diagnosis", "planner", "evaluator", "intervention"],
    }
