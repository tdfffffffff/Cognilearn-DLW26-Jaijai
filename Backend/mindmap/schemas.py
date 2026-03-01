"""
Pydantic models for the MindMap v2 platform.

Covers all 5 core features:
  1. Error Classification (4 cognitive types)
  2. Voice-to-Text concept gap analysis
  3. Eye Tracking / Attention monitoring
  4. Daily Study Report
  5. Privacy management

Plus temporal models: forgetting curves, GRU momentum, circadian scheduling.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════

class ErrorType(str, Enum):
    CONCEPTUAL = "conceptual"
    CARELESS = "careless"
    TIME_CONSTRAINT = "time_constraint"
    APPLICATION = "application"


class ErrorSubType(str, Enum):
    KNOWLEDGE_GAP = "knowledge_gap"
    MISCONCEPTION = "misconception"
    TRANSFER_FAILURE = "transfer_failure"
    DECAY = "decay"
    NONE = "none"


class EngagementLabel(str, Enum):
    ACTIVE = "Active"
    COASTING = "Coasting"
    SLOWING = "Slowing"
    AT_RISK = "At Risk"


class DecayRisk(str, Enum):
    SAFE = "safe"
    WARNING = "warning"
    CRITICAL = "critical"


class AttentionState(str, Enum):
    FOCUSED = "focused"
    DISTRACTED = "distracted"
    DROWSY = "drowsy"
    NOT_PRESENT = "not_present"


class TaskIntensity(str, Enum):
    DEEP = "deep"
    LIGHT = "light"
    REVIEW = "review"


class InterventionType(str, Enum):
    CONCEPT_EXPLANATION = "concept_explanation"
    MYTH_BUSTING = "myth_busting"
    TIMED_DRILL = "timed_drill"
    UNTIMED_PRACTICE = "untimed_practice"
    CROSS_TOPIC_EXAMPLE = "cross_topic_example"
    SPACED_RETRIEVAL = "spaced_retrieval"


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 1 — Error Classification
# ═══════════════════════════════════════════════════════════════════════════════

class ErrorDiagnosis(BaseModel):
    """Per-topic error classification result."""
    topic_id: str
    topic_name: str
    error_type: ErrorType
    sub_type: ErrorSubType
    confidence: float = Field(..., ge=0.0, le=1.0)
    shap_explanation: str = Field(..., description="Plain-English SHAP reason")
    features: dict[str, float] = Field(default_factory=dict,
                                        description="Feature values used")
    intervention_type: InterventionType


class ErrorProfile(BaseModel):
    """Full error profile for a student across all topics."""
    student_id: str
    diagnoses: list[ErrorDiagnosis]
    overall_pattern: str
    cold_start: bool = Field(False, description="<5 attempts — limited data")


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 2 — Voice-to-Text Concept Gap
# ═══════════════════════════════════════════════════════════════════════════════

class VoiceGapReport(BaseModel):
    """Result of a voice concept coverage session."""
    topic_id: str
    topic_name: str
    extracted_keywords: list[str]
    expected_keywords: list[str]
    missing_keywords: list[str]
    coverage_score: float = Field(..., ge=0.0, le=1.0)
    feedback: str


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 3 — Eye Tracking / Attention
# ═══════════════════════════════════════════════════════════════════════════════

class AttentionSnapshot(BaseModel):
    """Session-level attention statistics."""
    total_seconds: int
    focused_pct: float
    distracted_pct: float
    drowsy_pct: float
    not_present_pct: float
    fatigue_onset_min: Optional[float] = Field(
        None, description="Minutes into session when drowsiness first detected")
    ear_mean: float = Field(..., description="Mean Eye Aspect Ratio")


class AdaptiveBreak(BaseModel):
    """Personalised Pomodoro timing."""
    work_minutes: int
    break_minutes: int
    rationale: str


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 4 — Daily Report
# ═══════════════════════════════════════════════════════════════════════════════

class DailyReport(BaseModel):
    """End-of-session daily study productivity report."""
    student_id: str
    date: str
    session_duration_min: float
    questions_attempted: int
    accuracy_pct: float
    error_types_today: list[ErrorType]
    focus_quality_pct: float
    fatigue_onset_min: Optional[float]
    voice_coverage_avg: Optional[float]
    brief_completion_pct: float
    narrative: str = Field(..., description="LLM-generated narrative summary")
    improvement_vs_yesterday: Optional[str]
    priority_tomorrow: Optional[str]


# ═══════════════════════════════════════════════════════════════════════════════
# Feature 5 — Privacy
# ═══════════════════════════════════════════════════════════════════════════════

class PrivacyDataSummary(BaseModel):
    """What data is stored for a student (transparency page)."""
    student_id: str
    data_items: list[dict[str, str]]
    auto_delete_days: int = 30
    last_purge: Optional[datetime] = None
    total_records: int


class PurgeResult(BaseModel):
    """Result of user-triggered data purge."""
    student_id: str
    records_deleted: int
    purged_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# Temporal Models
# ═══════════════════════════════════════════════════════════════════════════════

class TopicMemory(BaseModel):
    """Per-topic forgetting curve fit and retrievability."""
    topic_id: str
    topic_name: str
    stability_days: float = Field(..., description="Fitted stability S (days)")
    decay_rate: float = Field(..., description="Fitted decay exponent b")
    retrievability: float = Field(..., ge=0.0, le=1.0)
    hours_since_last_review: float
    decay_risk: DecayRisk
    next_optimal_review: Optional[datetime] = None


class MomentumSnapshot(BaseModel):
    """GRU-derived engagement momentum."""
    trend_7d: float
    trend_14d: float
    predicted_next_login_gap_h: float
    momentum_score: float = Field(..., ge=0.0, le=1.0)


class EngagementHealth(BaseModel):
    """Engagement health classification."""
    label: EngagementLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    features_used: dict[str, Any]


class AvoidanceSignal(BaseModel):
    """Avoidance pattern for a topic."""
    topic_id: str
    topic_name: str
    skip_rate: float
    hint_spike: bool
    consecutive_skips: int
    severity: str


class CircadianWindow(BaseModel):
    """Peak attention window."""
    peak_start_hour: int = Field(..., ge=0, le=23)
    peak_end_hour: int = Field(..., ge=0, le=23)
    confidence: float = Field(..., ge=0.0, le=1.0)
    median_session_minutes: float
    timezone: str = "UTC"


class ScheduleBlock(BaseModel):
    """A single recommended study block."""
    start_hour: int
    end_hour: int
    intensity: TaskIntensity
    suggested_topics: list[str]
    rationale: str


class StudySchedule(BaseModel):
    """Daily study schedule recommendation."""
    blocks: list[ScheduleBlock]
    total_deep_minutes: int
    total_light_minutes: int


# ═══════════════════════════════════════════════════════════════════════════════
# Knowledge Graph
# ═══════════════════════════════════════════════════════════════════════════════

class KnowledgeNode(BaseModel):
    topic_id: str
    topic_name: str
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    error_type: Optional[ErrorType] = None


class KnowledgeEdge(BaseModel):
    source: str
    target: str
    relation: str = "prerequisite"


class KnowledgeGraphState(BaseModel):
    nodes: list[KnowledgeNode]
    edges: list[KnowledgeEdge]
    at_risk_topics: list[str]


# ═══════════════════════════════════════════════════════════════════════════════
# Confidence Bridge
# ═══════════════════════════════════════════════════════════════════════════════

class ConfidenceBridge(BaseModel):
    """Confidence Bridge protocol result."""
    triggered: bool
    original_topic: Optional[str] = None
    prerequisite_served: Optional[str] = None
    mastery_boost_message: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# Agent Outputs
# ═══════════════════════════════════════════════════════════════════════════════

class DiagnosisOutput(BaseModel):
    error_profile: ErrorProfile
    topic_memories: list[TopicMemory]
    attention: AttentionSnapshot
    voice_gap: Optional[VoiceGapReport] = None
    engagement: EngagementHealth
    avoidance_signals: list[AvoidanceSignal]
    knowledge_graph: KnowledgeGraphState
    momentum: MomentumSnapshot


class PlannerOutput(BaseModel):
    study_brief: str
    schedule: StudySchedule
    adaptive_break: AdaptiveBreak
    circadian: CircadianWindow
    priority_topics: list[str]
    time_allocations: dict[str, int]


class EvaluatorResult(BaseModel):
    passed: bool
    checks: dict[str, bool]
    corrections: list[str]
    attempts: int


class InterventionOutput(BaseModel):
    topic_id: str
    topic_name: str
    intervention_type: InterventionType
    content: str
    confidence_bridge: Optional[ConfidenceBridge] = None


# ═══════════════════════════════════════════════════════════════════════════════
# Top-level endpoint response
# ═══════════════════════════════════════════════════════════════════════════════

class StudentDashboard(BaseModel):
    """Complete response for GET /student/{student_id}/dashboard."""
    student_id: str
    generated_at: datetime
    diagnosis: DiagnosisOutput
    plan: PlannerOutput
    interventions: list[InterventionOutput]
    daily_report: DailyReport
    privacy: PrivacyDataSummary
    evaluator: EvaluatorResult
