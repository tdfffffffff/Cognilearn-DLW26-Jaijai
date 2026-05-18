# CogniLearn

> AI-powered adaptive learning system with real-time fatigue detection, voice tutoring, and personalised knowledge graphs using multimodal ML, GPT-4o, and on-device computer vision.

Placed **Top 10 in the Microsoft track at Deep Learning Week 2026 (DLW26)**, competing against teams from across Singapore's universities.

**Tech stack:** React 18 (Vite + TypeScript) · FastAPI (Python 3.10+) · Supabase (PostgreSQL + Auth) · OpenAI GPT-4o · MediaPipe FaceMesh · XGBoost + SHAP · Web Speech API

---

## Key outcomes

- Top 10 finish in the Microsoft track at Deep Learning Week 2026
- Real-time, on-device fatigue detection running entirely in-browser — no video stored or transmitted
- 4-agent AI pipeline (Diagnosis → Planner → Evaluator → Intervention) driving personalised study plans
- 6-category error classification (Conceptual, Procedural, Factual, Metacognitive, Transfer, Application) via XGBoost + SHAP
- Voice-based Feynman technique grading with sentence-by-sentence accuracy analysis
- GDPR-compliant data transparency with full export and deletion

---

## Table of Contents

1. [System overview (why this exists)](#system-overview-why-this-exists)
2. [System architecture](#system-architecture)
3. [Technology choices and rationale](#technology-choices-and-rationale)
4. [Core features](#core-features)
5. [Repository structure](#repository-structure)
6. [Prerequisites](#prerequisites)
7. [Local setup](#local-setup)
8. [Environment variables](#environment-variables)
9. [API overview](#api-overview)
10. [ML model](#ml-model)
11. [Running tests](#running-tests)
12. [Troubleshooting](#troubleshooting)

---

## System overview (why this exists)

Students rarely struggle because they lack access to content. They struggle because they don't know *what* they don't know, don't notice when they're too tired to learn effectively, and have no structured way to verify that a concept has moved from short-term exposure to durable understanding.

**CogniLearn** addresses all three gaps simultaneously. It monitors cognitive state continuously via webcam-based fatigue tracking, classifies exactly where understanding breaks down using an XGBoost error classifier, and uses a 4-agent AI pipeline to generate study interventions tailored to each student's real-time knowledge graph.

The system is designed around three constraints that shaped every technical decision:

| Constraint | Design response |
|---|---|
| No video should leave the device | MediaPipe FaceMesh runs fully in-browser; only derived fatigue metrics are sent to the backend |
| Students must be able to trust the system with their data | GDPR-style transparency, export, auto-delete scheduling |
| Interventions must be actionable, not generic | Error classification before study plan generation; the planner agent reads the diagnosis output directly |

The result is a learning companion that watches how you study, not just what you study.

---

## System architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Browser (React 18 SPA)                          │
│                                                                      │
│  CognitiveFingerprint · StudyBrief · QuizMe · KnowledgeGraph         │
│  AttentionMonitor · MyData                                           │
│                                                                      │
│  MediaPipe FaceMesh (on-device)                                      │
│  → EAR · PERCLOS · blink rate → fatigueEngine.ts → fatigue %         │
│  → WorkBreakCoachContext (state machine) → break reminders           │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS + JSON · Axios · JWT Bearer
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python 3.10+)                    │
│                                                                      │
│  Routes: chat · quiz · voice · dashboard · diagnose · temporal       │
│  attention · knowledge-graph · report · privacy · data-export        │
│                                                                      │
│  agents.py          – 4-agent pipeline (LangChain + GPT-4o)          │
│  error_classifier.py – XGBoost + SHAP 6-category classification      │
│  knowledge_graph.py  – force-directed graph + risk propagation       │
│  forgetting.py       – spaced repetition + forgetting curves         │
│  attention.py        – adaptive break scheduling                     │
│  voice.py            – Web Speech API → GPT-4o sentence grading      │
│  privacy.py          – GDPR data management                          │
└───────────────┬───────────────────────────┬──────────────────────────┘
                │                           │
                ▼                           ▼
┌──────────────────────┐       ┌──────────────────────────┐
│   Supabase           │       │   OpenAI                 │
│   (PostgreSQL)       │       │                          │
│                      │       │  GPT-4o                  │
│   Auth + sessions    │       │  → tutor chat            │
│   Row-level security │       │  → quiz generation       │
│   Auto-delete hooks  │       │  → voice analysis        │
└──────────────────────┘       │  → 4-agent pipeline      │
                               └──────────────────────────┘
```

---

## Technology choices and rationale

### MediaPipe FaceMesh (on-device, not server-side)

Fatigue detection runs entirely in the browser via MediaPipe's JavaScript runtime. The backend never receives video frames — only derived metrics (EAR, PERCLOS, blink rate) computed locally. This is the only architecture that satisfies the privacy requirement while still enabling real-time feedback. The camera persists across page navigation via a React context so fatigue state is continuous, not session-scoped.

### XGBoost + SHAP (not a black-box LLM classifier)

Error classification uses a trained XGBoost model with SHAP explainability for three reasons: the 6-category taxonomy requires consistent, reproducible labels across students; XGBoost inference is deterministic and fast (no API latency); and SHAP values make each classification auditable. GPT-4o is reserved for tasks that require language generation, not structured classification.

### 4-agent pipeline (not a single-prompt approach)

The backend uses four sequential agents — Diagnosis, Planner, Evaluator, Intervention — because a single prompt conflating all four tasks produces generic output. Each agent reads the output of the previous one: the Planner cannot produce a relevant study plan without the Diagnosis agent's error classification first. Separating concerns also makes each agent independently testable and replaceable.

### Supabase (not self-hosted PostgreSQL)

Supabase provides managed PostgreSQL with row-level security, Auth token refresh handled by the client library, and native auto-delete scheduling via database hooks. The frontend only uses the Supabase client for auth token refresh — all data queries go through FastAPI. This keeps the backend the single source of truth for all business logic.

### Web Speech API (not Whisper)

Practice mode uses the browser's Web Speech API for transcription rather than OpenAI Whisper to avoid the latency and cost of streaming audio to the backend. The transcript is then sent to GPT-4o for sentence-level accuracy grading, giving near-real-time feedback on spoken explanations.

---

## Core features

**(a) Real-time fatigue detection and adaptive break coaching**

MediaPipe FaceMesh tracks eye aspect ratio (EAR), PERCLOS (proportion of time eyelids are 80%+ closed), and blink rate at 30fps. A state machine in `workBreakCoach.ts` accumulates a rolling fatigue score and triggers a break reminder when fatigue exceeds 60% for one continuous minute. Break reminders are 5 or 10 minutes based on accumulated fatigue depth. Thresholds adapt over time to individual baseline variation.

**(b) 6-category error classification**

Every quiz answer is classified into one of six categories — Conceptual, Procedural, Factual, Metacognitive, Transfer, Application — by the XGBoost classifier in `error_classifier.py`. SHAP values expose which features drove each classification. The Cognitive Fingerprint page renders these distributions as a hexagonal radar chart, giving students a visual map of their error profile across topics.

**(c) 4-agent AI study pipeline**

`GET /student/{id}/dashboard` triggers four sequential agents. The Diagnosis agent reads historical error distributions. The Planner agent generates a today-specific study plan against that diagnosis. The Evaluator agent scores the plan for feasibility given the student's session history. The Intervention agent rewrites any low-feasibility items into concrete, actionable tasks. The combined output feeds the Study Brief page.

**(d) Voice-based Feynman technique (Practice mode)**

Students select a topic, speak their explanation aloud, and receive sentence-by-sentence accuracy scores. Web Speech API transcribes locally; the transcript is sent to `voice.py` where GPT-4o grades each sentence against the known concept definition. Gaps between what the student said and what is correct are returned as targeted feedback.

**(e) Force-directed knowledge graph with risk propagation**

`knowledge_graph.py` builds a D3 force-directed graph of topic relationships. When a topic has a high error rate, risk propagates to neighbouring nodes weighted by relationship strength. Topics that appear safe in isolation may be flagged as at-risk because a prerequisite topic is weak. The frontend renders this live with hover-to-inspect and click-to-drill-down.

**(f)Spaced repetition with forgetting curves**

`forgetting.py` models each topic's retention using an Ebbinghaus-derived decay function fitted to the student's actual review history. The Study Brief surfaces topics whose estimated retention has dropped below a configurable threshold, ordering them by a composite score of decay rate, error severity, and last-reviewed recency.

**(g) GDPR-compliant data management**

`privacy.py` exposes full data transparency (what is stored, when), JSON export of all student records, one-click deletion, and configurable auto-delete scheduling via Supabase database hooks. The My Data page presents this as a structured audit view.

---

## Repository structure

```
CogniLearn/
├── Frontend/                    # React 18 + Vite + TypeScript + Tailwind + shadcn/ui
│   └── src/
│       ├── components/          # DrowsinessMonitor, FatigueAlert, Layout, UI kit
│       ├── context/             # AuthContext, WorkBreakCoachContext, FatigueStreamContext
│       ├── pages/               # CognitiveFingerprint, QuizMe, AttentionMonitor, etc.
│       │   └── Admin/           # (reserved)
│       ├── lib/                 # api.ts, fatigueEngine.ts, workBreakCoach.ts, supabase.ts
│       ├── data/                # topicStore, errorProfileStore, quizData, mockData
│       ├── hooks/               # use-topics, use-error-profile, use-mobile, use-toast
│       └── test/                # Vitest test files
│
├── Backend/
│   └── mindmap/
│       ├── app.py               # FastAPI app, router registration, CORS, error handlers
│       ├── agents.py            # 4-agent pipeline (Diagnosis → Planner → Evaluator → Intervention)
│       ├── error_classifier.py  # XGBoost + SHAP 6-category error classification
│       ├── knowledge_graph.py   # Force-directed graph + risk propagation
│       ├── forgetting.py        # Forgetting curves + spaced repetition scheduler
│       ├── attention.py         # Attention stats + adaptive break scheduling
│       ├── voice.py             # Web Speech API → GPT-4o sentence-level grading
│       ├── report.py            # Daily study report generation
│       ├── privacy.py           # GDPR data management + auto-delete
│       ├── schemas.py           # Pydantic v2 request/response models
│       └── data.py              # Demo data generators
│
├── Model/                       # ML model training (optional — pre-trained artifacts included)
│   ├── DLW_Model.ipynb          # XGBoost error classifier training notebook
│   ├── models/                  # Pre-trained model artifacts (loaded automatically)
│   └── GeneratedData/           # Synthetic training data
│
├── testbench/                   # Everything a tester needs
│   ├── SETUP_AND_RUN.md         # Step-by-step install, configure, run & test guide
│   ├── .env.example             # Environment variable template
│   ├── sample_interactions.json # 20 sample records for data format inspection
│   ├── schema.sql               # Supabase DDL (tables, RLS policies, auto-delete hooks)
│   ├── test_backend.sh          # Automated API tests via curl
│   └── test_backend.py          # Automated API tests via Python
│
├── start.sh                     # One-click launcher (macOS / Linux)
├── start.bat                    # One-click launcher (Windows)
└── README.md
```

---

## Prerequisites

- **Node.js 18+** and **npm 9+**
- **Python 3.10+**
- A **Supabase** project with the schema applied (see `testbench/schema.sql`)
- An **OpenAI API key** with GPT-4o access
- A **webcam** for the Attention Monitor

---

## Local setup

### 1. Clone and configure

```bash
git clone https://github.com/tdfffffffff/Cognilearn-DLW26-Jaijai.git
cd Cognilearn-DLW26-Jaijai
```

### 2. Backend

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `Backend/.env`:

```env
OpenAI_KEY=<your-openai-api-key>
SUPABASE_URL=https://<project>.supabase.co          # optional
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>         # optional
```

Start the server (from repo root):

```bash
python3 -m uvicorn Backend.mindmap.app:app --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Interactive docs (Swagger UI): `http://localhost:8000/docs`

### 3. Frontend

```bash
cd Frontend
npm install
```

Create `Frontend/.env`:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

App available at `http://localhost:8080`. Open in **Chrome** (webcam access required for Attention Monitor).

> **One-click alternative:** `./start.sh` (macOS/Linux) or `start.bat` (Windows) launches both servers automatically.

---

## Environment variables

### `Backend/.env`

| Variable | Required | Description |
|---|---|---|
| `OpenAI_KEY` | Y | OpenAI API key for GPT-4o (chat, quiz, voice analysis, 4-agent pipeline) |
| `SUPABASE_URL` | N | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | N | Supabase service role key (backend only — never expose to frontend) |

### `Frontend/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Y | Supabase project URL (auth token refresh only) |
| `VITE_SUPABASE_ANON_KEY` | Y | Supabase anon/public key |
| `VITE_API_URL` | N | Backend URL (default: `http://localhost:8000`) |

---

## API overview

50+ REST endpoints. Full interactive docs at `http://localhost:8000/docs` when the server is running.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/chat/tutor` | AI tutor conversation (Ask mode) |
| `POST` | `/quiz/generate-questions` | Generate quiz questions for a topic |
| `POST` | `/quiz/assess-answer` | Assess answer with 6-category error classification |
| `POST` | `/voice/analyze-understanding` | Analyse spoken explanation (Practice mode) |
| `GET` | `/student/{id}/dashboard` | Full 4-agent pipeline output |
| `GET` | `/student/{id}/diagnose` | Error classification (XGBoost + SHAP) |
| `GET` | `/student/{id}/temporal` | Forgetting curves + momentum |
| `GET` | `/student/{id}/attention` | Attention stats + adaptive break schedule |
| `GET` | `/student/{id}/knowledge-graph` | Knowledge graph with risk propagation |
| `POST` | `/student/{id}/voice/{topic_id}` | Voice concept gap analysis |
| `GET` | `/student/{id}/report` | Daily study report |
| `GET` | `/student/{id}/privacy` | Data transparency view |
| `DELETE` | `/student/{id}/privacy` | GDPR data purge |
| `PUT` | `/student/{id}/privacy/auto-delete` | Configure auto-delete schedule |
| `GET` | `/student/{id}/data-export` | Export all student data as JSON |
| `GET` | `/demo/aisha` | Demo profile — Aisha |
| `GET` | `/demo/marcus` | Demo profile — Marcus |

---

## ML model

Pre-trained XGBoost model artifacts are included in `Model/models/` and loaded automatically by the backend at startup — retraining is not required to run the system.

To retrain or inspect the model:

```bash
cd Model
pip install -r requirements.txt
# Open DLW_Model.ipynb in Jupyter or VS Code
```

---

## Running tests

### Frontend

```bash
cd Frontend
npm test              # Vitest unit tests
npm run test:watch    # Watch mode
```

### Backend

The `testbench/` directory contains everything needed:

| File | Purpose |
|---|---|
| `SETUP_AND_RUN.md` | Step-by-step install, configure, and test guide |
| `.env.example` | Environment variable template |
| `sample_interactions.json` | 20 sample records for inspecting data formats |
| `schema.sql` | Supabase DDL — tables, RLS, auto-delete hooks |
| `test_backend.sh` | Automated API tests via curl |
| `test_backend.py` | Automated API tests via Python |

```bash
chmod +x testbench/test_backend.sh
./testbench/test_backend.sh          # or: python3 testbench/test_backend.py
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Failed to fetch" in Ask / Practice / Test mode | Backend is not running. Start from repo root: `python3 -m uvicorn Backend.mindmap.app:app --port 8000` |
| "No face detected" on Attention Monitor | Allow webcam in browser permissions. Check lighting. Click the Enable Camera button |
| `ModuleNotFoundError: No module named 'mindmap'` | Run uvicorn from the **repo root**, not from inside `Backend/` |
| `Missing VITE_SUPABASE_URL` | Create `Frontend/.env` with Supabase credentials |
| `torch` install is very slow | Install CPU-only first: `pip install torch --index-url https://download.pytorch.org/whl/cpu` |
| OpenAI rate limit errors | Check quota at [platform.openai.com](https://platform.openai.com) |
| Fatigue alert not triggering | Ensure camera is enabled; alert fires after fatigue > 60% sustained for 1 minute |

---

*CogniLearn · Top 10, Microsoft Track — Deep Learning Week 2026 · React 18 + FastAPI + Supabase + GPT-4o + MediaPipe*
