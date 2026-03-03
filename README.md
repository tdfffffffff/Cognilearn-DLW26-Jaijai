# CogniLearn — Cognitive AI Study Companion

> Real-time fatigue detection, AI-powered tutoring, adaptive quizzes, voice-based concept analysis, and privacy-first learning analytics — all running on-device in the browser.

**Stack:** React 18 (Vite + TypeScript) · FastAPI (Python 3.10+) · Supabase (Auth + PostgreSQL) · OpenAI GPT-4o · MediaPipe FaceMesh · XGBoost + SHAP

---

## Table of Contents

1. [Features](#features)
2. [Repository Structure](#repository-structure)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Frontend Setup](#frontend-setup)
6. [Backend Setup](#backend-setup)
7. [Environment Variables](#environment-variables)
8. [API Endpoints](#api-endpoints)
9. [ML Model (Optional)](#ml-model-optional)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Page | Description |
|---------|------|-------------|
| **Cognitive Fingerprint** | `/` | Hexagonal error-type radar chart, topic mastery folders, add/remove topics |
| **Study Brief** | `/study-brief` | AI-generated daily study plan with circadian peak detection |
| **Quiz Me** | `/quiz-me` | Three modes — **Ask** (AI tutor chat with voice), **Practice** (voice Feynman technique), **Test** (image/text answer grading with 6-category error classification) |
| **Knowledge Graph** | `/knowledge-graph` | Force-directed D3 graph showing topic relationships and risk propagation |
| **Attention Monitor** | `/attention` | Real-time webcam fatigue detection (EAR, PERCLOS, blink rate), session-long timeline charts, adaptive work-break coaching with 5/10-min break reminders |
| **My Data** | `/my-data` | GDPR-style data transparency, export, and deletion |

### Key Technical Highlights

- **On-device eye tracking** — MediaPipe FaceMesh runs entirely in-browser; no video is stored or transmitted
- **Background camera persistence** — camera keeps recording across page navigation; controlled only via Enable/Disable button
- **Adaptive break coaching** — state machine with personalised thresholds that adapt over time; triggers when fatigue > 60% for 1 minute
- **Voice analysis** — Web Speech API transcription → OpenAI sentence-by-sentence accuracy grading
- **4-agent AI pipeline** — Diagnosis → Planner → Evaluator → Intervention agents on the backend
- **6-category error classification** — Conceptual, Procedural, Factual, Metacognitive, Transfer, Application

---

## Repository Structure

```
CogniLearn/
├── Frontend/                 # React + Vite + TypeScript + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── components/       # DrowsinessMonitor, FatigueAlert, Layout, UI kit
│   │   ├── context/          # AuthContext, WorkBreakCoachContext, FatigueStreamContext
│   │   ├── pages/            # CognitiveFingerprint, QuizMe, AttentionMonitor, etc.
│   │   ├── lib/              # api.ts, fatigueEngine.ts, workBreakCoach.ts, supabase.ts
│   │   ├── data/             # topicStore, errorProfileStore, quizData, mockData
│   │   ├── hooks/            # use-topics, use-error-profile, use-mobile, use-toast
│   │   └── test/             # Vitest test files
│   ├── package.json
│   └── vite.config.ts
│
├── Backend/                  # FastAPI Python backend
│   ├── mindmap/
│   │   ├── app.py            # Main FastAPI app with all routes
│   │   ├── voice.py          # OpenAI voice analysis, chat tutor, quiz generation
│   │   ├── agents.py         # 4-agent AI pipeline
│   │   ├── error_classifier.py  # XGBoost + SHAP error classification
│   │   ├── knowledge_graph.py   # Knowledge graph with risk propagation
│   │   ├── forgetting.py     # Forgetting curves + spaced repetition
│   │   ├── attention.py      # Attention stats + adaptive break scheduling
│   │   ├── report.py         # Daily study report generation
│   │   ├── privacy.py        # GDPR data management
│   │   ├── schemas.py        # Pydantic models
│   │   └── data.py           # Demo data generators
│   ├── requirements.txt
│   └── .env                  # API keys (not committed)
│
├── Model/                    # ML model training (optional)
│   ├── DLW_Model.ipynb       # Jupyter notebook for XGBoost error classifier
│   ├── models/               # Pre-trained model artifacts
│   └── GeneratedData/        # Synthetic training data
│
├── testbench/                # Test scripts, setup docs & sample data
│   ├── SETUP_AND_RUN.md      # Step-by-step install, run & test guide
│   ├── .env.example          # Environment variable template
│   ├── sample_interactions.json  # Sample data for testing
│   ├── schema.sql            # Supabase database setup script
│   ├── test_backend.sh       # Automated backend API test (shell)
│   └── test_backend.py       # Python-based API test suite
│
├── start.sh                  # One-click launcher (macOS)
├── start.bat                 # One-click launcher (Windows)
├── package.json              # Root-level npm scripts
└── README.md                 # ← You are here
```

---

## Prerequisites

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| **Node.js** | 18.x | `node --version` |
| **npm** | 9.x | `npm --version` |
| **Python** | 3.10+ | `python3 --version` |
| **pip** | 23.x | `pip --version` |
| **Git** | 2.x | `git --version` |

A **webcam** is required for the Attention Monitor fatigue detection feature.

---

## Quick Start

The fastest way to get everything running — **two terminals side by side**:

### macOS / Linux

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/CogniLearn.git
cd CogniLearn

# 2. Backend (Terminal 1)
cd Backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Create Backend/.env with: OpenAI_KEY=sk-proj-xxxx
cd ..
python3 -m uvicorn Backend.mindmap.app:app --host 0.0.0.0 --port 8000

# 3. Frontend (Terminal 2)
cd Frontend
npm install
npm run dev

# 4. Open http://localhost:8080 in Chrome (webcam access required for Attention Monitor)
```

### Windows

```powershell
# 1. Clone the repo
git clone https://github.com/<your-username>/CogniLearn.git
cd CogniLearn

# 2. Backend (Terminal 1)
cd Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Create Backend\.env with: OpenAI_KEY=sk-proj-xxxx
cd ..
python -m uvicorn Backend.mindmap.app:app --host 0.0.0.0 --port 8000

# 3. Frontend (Terminal 2)
cd Frontend
npm install
npm run dev

# 4. Open http://localhost:8080 in Chrome
```

> **One-click alternative:** Run `./start.sh` (macOS) or `start.bat` (Windows) from the project root to launch both servers automatically.

---

## Frontend Setup

### 1. Install dependencies

```bash
cd Frontend
npm install
```

### 2. Configure environment variables

Create `Frontend/.env` for Supabase authentication:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

| Variable | Where to find it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` key |

### 3. Start the dev server

```bash
npm run dev
```

Opens at **http://localhost:8080**.

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Backend Setup

### 1. Create a virtual environment

```bash
cd Backend
python3 -m venv venv

# Activate:
source venv/bin/activate        # macOS / Linux
# .\venv\Scripts\Activate.ps1   # Windows PowerShell
# .\venv\Scripts\activate.bat   # Windows CMD
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

> **Tip:** `torch` is large. For CPU-only (much faster install):
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> pip install -r requirements.txt
> ```

### 3. Configure environment variables

Create `Backend/.env`:

```env
OpenAI_KEY=<your-openai-api-key>
```

| Variable | Where to find it |
|----------|-----------------|
| `OpenAI_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys |

### 4. Start the server

**From project root** (recommended):
```bash
python3 -m uvicorn Backend.mindmap.app:app --host 0.0.0.0 --port 8000
```

**Or from inside `Backend/`:**
```bash
uvicorn mindmap.app:app --host 0.0.0.0 --port 8000
```

- API: **http://localhost:8000**
- Swagger UI: **http://localhost:8000/docs**

---

## Environment Variables

### `Backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `OpenAI_KEY` | **Yes** | OpenAI API key for GPT-4o (chat, quiz generation, voice analysis) |
| `SUPABASE_URL` | Optional | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role key |

### `Frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL (for authentication) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anon/public key |
| `VITE_API_URL` | No | Backend URL (defaults to `http://localhost:8000`) |

> **Security:** Never commit `.env` files. They are listed in `.gitignore`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/chat/tutor` | AI tutor conversation (Ask Mode) |
| `POST` | `/quiz/generate-from-materials` | Generate quiz from uploaded materials |
| `POST` | `/quiz/generate-questions` | Generate quiz questions for a topic |
| `POST` | `/quiz/assess-answer` | Assess answer with 6-category error classification |
| `POST` | `/voice/analyze-understanding` | Analyse spoken explanation (Practice Mode) |
| `GET` | `/student/{id}/dashboard` | Full 4-agent pipeline |
| `GET` | `/student/{id}/diagnose` | Error classification (XGBoost + SHAP) |
| `GET` | `/student/{id}/temporal` | Forgetting curves + momentum |
| `GET` | `/student/{id}/attention` | Attention stats + adaptive break |
| `GET` | `/student/{id}/knowledge-graph` | Knowledge graph with risk propagation |
| `POST` | `/student/{id}/voice/{topic_id}` | Voice concept gap analysis |
| `GET` | `/student/{id}/report` | Daily study report |
| `GET` | `/student/{id}/privacy` | Data transparency |
| `DELETE` | `/student/{id}/privacy` | GDPR data purge |
| `PUT` | `/student/{id}/privacy/auto-delete` | Configure auto-delete schedule |
| `GET` | `/student/{id}/data-export` | Export student data as JSON |
| `GET` | `/demo/aisha` | Demo profile — Aisha |
| `GET` | `/demo/marcus` | Demo profile — Marcus |

Full interactive docs at **http://localhost:8000/docs** when the server is running.

---

## ML Model (Optional)

Pre-trained model artifacts are already saved in `Model/models/` and loaded automatically by the backend — you do **not** need to retrain.

To retrain or inspect the model:
```bash
cd Model
pip install -r requirements.txt
# Open DLW_Model.ipynb in Jupyter or VS Code
```

---

## Testing

### Frontend unit tests

```bash
cd Frontend
npm test              # Run all Vitest tests
npm run test:watch    # Watch mode
```

### Backend API tests

See the **[testbench/](testbench/)** folder for everything a tester needs:

| File | Purpose |
|------|---------|
| **[SETUP_AND_RUN.md](testbench/SETUP_AND_RUN.md)** | Step-by-step install, configure, run & test guide |
| **[.env.example](testbench/.env.example)** | Template showing all required API keys |
| **[sample_interactions.json](testbench/sample_interactions.json)** | 20 sample records so testers can inspect data format |
| **[schema.sql](testbench/schema.sql)** | Supabase database DDL (tables, RLS, auto-delete) |
| **[test_backend.sh](testbench/test_backend.sh)** | Automated API tests via curl |
| **[test_backend.py](testbench/test_backend.py)** | Automated API tests via Python |

```bash
# Run automated API tests
chmod +x testbench/test_backend.sh
./testbench/test_backend.sh          # or: python3 testbench/test_backend.py
```

For the complete setup guide start here: **[testbench/SETUP_AND_RUN.md](testbench/SETUP_AND_RUN.md)**

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Failed to fetch"** in Ask / Practice / Test mode | Backend is not running. Start it: `python3 -m uvicorn Backend.mindmap.app:app --port 8000` from repo root |
| **"No face detected"** on Attention Monitor | Ensure webcam permission is allowed in browser. Check lighting. Click the Enable Camera button |
| **`ModuleNotFoundError: No module named 'mindmap'`** | Run uvicorn from the **repo root**: `python3 -m uvicorn Backend.mindmap.app:app --port 8000` |
| **`Missing VITE_SUPABASE_URL`** | Create `Frontend/.env` with Supabase credentials (see [Frontend Setup](#frontend-setup)) |
| **`torch` install is very slow** | Use CPU-only: `pip install torch --index-url https://download.pytorch.org/whl/cpu` first |
| **Port 8080 already in use** | Change port in `Frontend/vite.config.ts` or kill the existing process |
| **OpenAI rate limit errors** | Check your API key quota at [platform.openai.com](https://platform.openai.com) |
| **Fatigue alert not showing** | Ensure camera is enabled; sit in front of webcam; alert triggers after fatigue > 60% sustained for 1 minute |

---

## License

This project was built for the DLW Hackathon. All rights reserved.
