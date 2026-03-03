-- ═══════════════════════════════════════════════════════════════════════════════
-- CogniLearn — Supabase Database Schema
--
-- Run this in the Supabase SQL Editor or via CLI:
--   supabase db push < testbench/schema.sql
--
-- This creates all tables needed for CogniLearn's persistent data layer.
-- The backend works WITHOUT these tables (uses in-memory synthetic data),
-- but deploying them enables real data persistence across sessions.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Extensions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. STUDENT PROFILES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS students (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name    TEXT,
    email           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE students IS 'Student profiles linked to Supabase auth users';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. QUIZ INTERACTIONS  (Feature 1: Error Classification input)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quiz_interactions (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic                   TEXT NOT NULL,
    question_id             TEXT NOT NULL,
    is_correct              BOOLEAN NOT NULL DEFAULT false,
    time_taken_seconds      INTEGER NOT NULL,
    attempt_number          INTEGER NOT NULL DEFAULT 1,
    timed_condition         BOOLEAN NOT NULL DEFAULT false,
    session_timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    days_since_last_correct INTEGER DEFAULT 0,
    cross_topic_ids         TEXT[] DEFAULT '{}',
    error_label             TEXT,      -- none | misconception | anxiety | transfer_failure
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_student        ON quiz_interactions(student_id);
CREATE INDEX idx_quiz_topic          ON quiz_interactions(topic);
CREATE INDEX idx_quiz_session_ts     ON quiz_interactions(session_timestamp);

COMMENT ON TABLE quiz_interactions IS 'Raw quiz attempt data — feeds the XGBoost error classifier';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ERROR CLASSIFICATION RESULTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE error_type AS ENUM ('conceptual', 'careless', 'time_constraint', 'application');
CREATE TYPE error_sub_type AS ENUM ('knowledge_gap', 'misconception', 'transfer_failure', 'decay', 'none');
CREATE TYPE intervention_type AS ENUM (
    'concept_explanation', 'myth_busting', 'timed_drill',
    'untimed_practice', 'cross_topic_example', 'spaced_retrieval'
);

CREATE TABLE IF NOT EXISTS error_diagnoses (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic_id            TEXT NOT NULL,
    topic_name          TEXT NOT NULL,
    error_type          error_type NOT NULL,
    sub_type            error_sub_type NOT NULL DEFAULT 'none',
    confidence          NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    shap_explanation    TEXT NOT NULL,
    features            JSONB DEFAULT '{}',
    intervention_type   intervention_type NOT NULL,
    diagnosed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diag_student ON error_diagnoses(student_id);

COMMENT ON TABLE error_diagnoses IS 'XGBoost + SHAP error classification results per topic';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ATTENTION / EYE TRACKING SESSIONS  (Feature 3)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE attention_state AS ENUM ('focused', 'distracted', 'drowsy', 'not_present');

CREATE TABLE IF NOT EXISTS attention_sessions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_start       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end         TIMESTAMPTZ,
    total_seconds       INTEGER NOT NULL DEFAULT 0,
    focused_pct         NUMERIC(5,2) DEFAULT 0,
    distracted_pct      NUMERIC(5,2) DEFAULT 0,
    drowsy_pct          NUMERIC(5,2) DEFAULT 0,
    not_present_pct     NUMERIC(5,2) DEFAULT 0,
    fatigue_onset_min   NUMERIC(6,2),        -- minutes into session when drowsiness started
    ear_mean            NUMERIC(5,4),        -- mean Eye Aspect Ratio
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attn_student ON attention_sessions(student_id);

COMMENT ON TABLE attention_sessions IS 'Per-session attention stats from MediaPipe face mesh';

-- Time-series fatigue data points (for timeline charts)
CREATE TABLE IF NOT EXISTS attention_datapoints (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id      BIGINT NOT NULL REFERENCES attention_sessions(id) ON DELETE CASCADE,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fatigue_pct     NUMERIC(5,2) NOT NULL,
    ear             NUMERIC(5,4),
    perclos         NUMERIC(5,4),
    blink_rate      NUMERIC(5,2),
    face_detected   BOOLEAN NOT NULL DEFAULT true,
    state           attention_state NOT NULL DEFAULT 'focused'
);

CREATE INDEX idx_dp_session ON attention_datapoints(session_id);

COMMENT ON TABLE attention_datapoints IS 'High-frequency fatigue telemetry (~every 5s)';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. VOICE SESSIONS  (Feature 2: Voice-to-Text Concept Gap)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_sessions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic_id            TEXT NOT NULL,
    topic_name          TEXT NOT NULL,
    coverage_score      NUMERIC(4,3) CHECK (coverage_score BETWEEN 0 AND 1),
    overall_accuracy    INTEGER CHECK (overall_accuracy BETWEEN 0 AND 100),
    extracted_keywords  TEXT[] DEFAULT '{}',
    expected_keywords   TEXT[] DEFAULT '{}',
    missing_keywords    TEXT[] DEFAULT '{}',
    feedback            TEXT,
    strengths           TEXT[] DEFAULT '{}',
    weaknesses          TEXT[] DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_student ON voice_sessions(student_id);

COMMENT ON TABLE voice_sessions IS 'Voice concept gap analysis results (transcript never stored)';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FORGETTING CURVES / TOPIC MEMORY  (Temporal)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE decay_risk AS ENUM ('safe', 'warning', 'critical');

CREATE TABLE IF NOT EXISTS topic_memories (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic_id                TEXT NOT NULL,
    topic_name              TEXT NOT NULL,
    stability_days          NUMERIC(8,3) NOT NULL,
    decay_rate              NUMERIC(8,5) NOT NULL,
    retrievability          NUMERIC(4,3) CHECK (retrievability BETWEEN 0 AND 1),
    hours_since_last_review NUMERIC(10,2),
    decay_risk              decay_risk NOT NULL DEFAULT 'safe',
    next_optimal_review     TIMESTAMPTZ,
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, topic_id)
);

CREATE INDEX idx_mem_student ON topic_memories(student_id);

COMMENT ON TABLE topic_memories IS 'Forgetting curve parameters per student-topic pair';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. DAILY REPORTS  (Feature 4)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_reports (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    report_date             DATE NOT NULL,
    session_duration_min    NUMERIC(8,2),
    questions_attempted     INTEGER DEFAULT 0,
    accuracy_pct            NUMERIC(5,2) DEFAULT 0,
    error_types_today       TEXT[] DEFAULT '{}',
    focus_quality_pct       NUMERIC(5,2),
    fatigue_onset_min       NUMERIC(6,2),
    voice_coverage_avg      NUMERIC(4,3),
    brief_completion_pct    NUMERIC(5,2),
    narrative               TEXT,
    improvement_vs_yesterday TEXT,
    priority_tomorrow       TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, report_date)
);

CREATE INDEX idx_report_student ON daily_reports(student_id);

COMMENT ON TABLE daily_reports IS 'Daily study productivity summaries with LLM narrative';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. KNOWLEDGE GRAPH STATE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic_id    TEXT NOT NULL,
    topic_name  TEXT NOT NULL,
    risk_score  NUMERIC(4,3) DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 1),
    error_type  error_type,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, topic_id)
);

CREATE TABLE IF NOT EXISTS knowledge_edges (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    source      TEXT NOT NULL,
    target      TEXT NOT NULL,
    relation    TEXT NOT NULL DEFAULT 'prerequisite',
    UNIQUE(student_id, source, target)
);

CREATE INDEX idx_kg_node_student ON knowledge_nodes(student_id);
CREATE INDEX idx_kg_edge_student ON knowledge_edges(student_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. PRIVACY / DATA MANAGEMENT  (Feature 5)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS privacy_settings (
    student_id       UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    auto_delete_days INTEGER NOT NULL DEFAULT 30 CHECK (auto_delete_days IN (7, 30, 90)),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_audit_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,       -- 'purge' | 'export' | 'auto_delete_set'
    detail      TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_student ON privacy_audit_log(student_id);

COMMENT ON TABLE privacy_settings   IS 'Per-student privacy preferences (auto-delete period)';
COMMENT ON TABLE privacy_audit_log  IS 'GDPR audit trail of all data actions';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. CURRICULUM NOTES  (for RAG / Practice Mode)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS curriculum_notes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    topic_id        TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    prerequisites   TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE curriculum_notes IS 'Concept explanations used for RAG in Practice Mode';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. ROW LEVEL SECURITY (RLS)
--     Each student can only access their own data.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_interactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_diagnoses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attention_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attention_datapoints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_memories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_nodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_audit_log     ENABLE ROW LEVEL SECURITY;

-- Students can read/write their own rows
CREATE POLICY "Students: own data" ON students
    FOR ALL USING (auth_user_id = auth.uid());

CREATE POLICY "Quiz: own data" ON quiz_interactions
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Diagnoses: own data" ON error_diagnoses
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Attention sessions: own data" ON attention_sessions
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Attention datapoints: own data" ON attention_datapoints
    FOR ALL USING (session_id IN (
        SELECT id FROM attention_sessions WHERE student_id IN (
            SELECT id FROM students WHERE auth_user_id = auth.uid()
        )
    ));

CREATE POLICY "Voice: own data" ON voice_sessions
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Memory: own data" ON topic_memories
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Reports: own data" ON daily_reports
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "KG nodes: own data" ON knowledge_nodes
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "KG edges: own data" ON knowledge_edges
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Privacy settings: own data" ON privacy_settings
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Audit log: own data" ON privacy_audit_log
    FOR ALL USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. AUTO-DELETE FUNCTION  (runs daily via Supabase cron)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_delete_expired_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT s.id AS student_id, p.auto_delete_days
        FROM students s
        JOIN privacy_settings p ON p.student_id = s.id
    LOOP
        DELETE FROM quiz_interactions
            WHERE student_id = r.student_id
            AND created_at < NOW() - (r.auto_delete_days || ' days')::INTERVAL;

        DELETE FROM attention_sessions
            WHERE student_id = r.student_id
            AND created_at < NOW() - (r.auto_delete_days || ' days')::INTERVAL;

        DELETE FROM voice_sessions
            WHERE student_id = r.student_id
            AND created_at < NOW() - (r.auto_delete_days || ' days')::INTERVAL;

        DELETE FROM daily_reports
            WHERE student_id = r.student_id
            AND created_at < NOW() - (r.auto_delete_days || ' days')::INTERVAL;

        DELETE FROM error_diagnoses
            WHERE student_id = r.student_id
            AND diagnosed_at < NOW() - (r.auto_delete_days || ' days')::INTERVAL;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION auto_delete_expired_data IS 'GDPR auto-delete: purge data older than each student''s configured retention period';


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done! All tables created with RLS + auto-delete support.
-- ═══════════════════════════════════════════════════════════════════════════════
