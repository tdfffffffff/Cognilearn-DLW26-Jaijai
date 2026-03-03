# CogniLearn — Setup & Run Guide

> **Audience:** Anyone cloning this repo for the first time — judges, contributors, or teammates.
> Follow each section in order and you'll have the full app running locally in ~10 minutes.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Clone the Repository](#2-clone-the-repository)
3. [Configure Environment Variables](#3-configure-environment-variables)
4. [Backend Setup](#4-backend-setup)
5. [Frontend Setup](#5-frontend-setup)
6. [Start Everything (One Command)](#6-start-everything-one-command)
7. [Start Manually (Two Terminals)](#7-start-manually-two-terminals)
8. [Verify the App Is Running](#8-verify-the-app-is-running)
9. [Run the Automated Test Suite](#9-run-the-automated-test-suite)
10. [Manual Feature Walkthrough](#10-manual-feature-walkthrough)
11. [Generate Sample Data (Optional)](#11-generate-sample-data-optional)
12. [Supabase Database Setup (Optional)](#12-supabase-database-setup-optional)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. System Requirements

| Tool | Minimum Version | How to Check |
|------|----------------|--------------|
| **Git** | 2.30+ | `git --version` |
| **Node.js** | 18.0+ | `node -v` |
| **npm** | 9.0+ (ships with Node) | `npm -v` |
| **Python** | 3.10+ | `python3 --version` |
| **pip** | latest | `pip3 --version` |
| **Webcam** | Any built-in or USB | OS camera settings |
| **Browser** | Chrome 100+ or Edge 100+ | Chromium-based recommended |

### Install Node.js (if missing)
```bash
# macOS (Homebrew)
brew install node

# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows — download from https://nodejs.org
```

### Install Python 3 (if missing)
```bash
# macOS
brew install python@3.11

# Ubuntu / Debian
sudo apt install python3 python3-pip python3-venv

# Windows — download from https://www.python.org/downloads/
```

---

## 2. Clone the Repository

```bash
git clone https://github.com/<your-org>/build-an-react-interface-3-frontend-web-interface-must-include-this-is-what-judges-see.git
cd build-an-react-interface-3-frontend-web-interface-must-include-this-is-what-judges-see
```

---

## 3. Configure Environment Variables

Copy the template from the testbench folder to the correct locations:

### Backend (.env)

```bash
cp testbench/.env.example Backend/.env
```

Then open `Backend/.env` and fill in your real keys:

```dotenv
# ── Required ──────────────────────────────────────────────────────────
OpenAI_KEY=sk-proj-REPLACE_WITH_YOUR_OPENAI_API_KEY

# ── Optional (only needed for Supabase auth & database) ──────────────
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...your-service-role-key
```

> **Without `OpenAI_KEY`:** The app still loads and non-AI features work (dashboard, attention monitor, knowledge graph). AI features (Ask Mode, Practice Mode, Test Mode) will return 500 errors.

### Frontend (.env)

```bash
# Create Frontend/.env (only needed for Supabase auth)
cat > Frontend/.env <<'EOF'
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:8000
EOF
```

> If you skip the Supabase keys, the app will error at login. For demo purposes you can set any placeholder and test backend-only features via curl.

---

## 4. Backend Setup

```bash
# 1. Navigate to Backend
cd Backend

# 2. (Recommended) Create a virtual environment
python3 -m venv venv

# 3. Activate it
#    macOS / Linux:
source venv/bin/activate
#    Windows:
#    venv\Scripts\activate.bat

# 4. Install all Python dependencies
pip install -r requirements.txt

# 5. Return to project root
cd ..
```

### What gets installed (key packages)

| Package | Purpose |
|---------|---------|
| `fastapi` + `uvicorn` | Web server & API framework |
| `openai` | GPT-4o for tutoring, quiz gen, answer assessment |
| `xgboost` + `shap` | Error classification ML model |
| `torch` | GRU momentum model |
| `numpy` + `scipy` | Numerical computations |
| `python-dotenv` | Loads `.env` file |
| `supabase` | Database client (optional) |
| `mediapipe` | Server-side face mesh utilities |

---

## 5. Frontend Setup

```bash
# 1. Navigate to Frontend
cd Frontend

# 2. Install Node dependencies
npm install

# 3. Return to project root
cd ..
```

### What gets installed (key packages)

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `vite` | Dev server & bundler (port 8080) |
| `tailwindcss` | Utility-first CSS |
| `@radix-ui/*` + `shadcn/ui` | Accessible component library |
| `recharts` | Timeline & chart visualisations |
| `framer-motion` | Animations |
| `@mediapipe/face_mesh` | Client-side face/eye tracking |
| `@supabase/supabase-js` | Auth & database |
| `katex` + `react-latex-next` | LaTeX math rendering |

---

## 6. Start Everything (One Command)

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

This opens two Terminal windows:
- **Backend** on `http://localhost:8000`
- **Frontend** on `http://localhost:8080`

### Windows

```cmd
start.bat
```

---

## 7. Start Manually (Two Terminals)

If the one-command script doesn't work, start each server yourself:

### Terminal 1 — Backend

```bash
# From the project root:
cd Backend
source venv/bin/activate        # skip if not using venv
cd ..
python3 -m uvicorn Backend.mindmap.app:app --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Terminal 2 — Frontend

```bash
cd Frontend
npm run dev
```

You should see:
```
VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:8080/
```

---

## 8. Verify the App Is Running

### Quick Health Check (Terminal)

```bash
# Backend
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"2.0.0","features":[...]}

# Frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
# Expected: 200
```

### Browser Check

1. Open **http://localhost:8080** in Chrome/Edge
2. You should see the CogniLearn login page
3. Open **http://localhost:8000/docs** for interactive API documentation (Swagger UI)

---

## 9. Run the Automated Test Suite

We provide two backend test runners (choose either):

### Option A: Shell Script

```bash
chmod +x testbench/test_backend.sh
./testbench/test_backend.sh
```

### Option B: Python Script

```bash
python3 testbench/test_backend.py
```

Both scripts:
- Test all 18 API endpoints
- Print color-coded PASS/FAIL results
- Exit with code 0 if all pass, nonzero otherwise
- Gracefully skip AI endpoints if `OpenAI_KEY` is not configured

### Frontend Unit Tests

```bash
cd Frontend
npm test
```

### Expected Results

```
═══════════════════════════════════════════
  CogniLearn Backend API Tests
  Server: http://localhost:8000
═══════════════════════════════════════════

1. Health Check
  ✓ GET /health

2. Demo Profiles
  ✓ GET /demo/aisha
  ✓ GET /demo/marcus

3. Student Dashboard Pipeline
  ✓ GET /student/{id}/dashboard
  ✓ GET /student/{id}/diagnose
  ✓ GET /student/{id}/temporal
  ✓ GET /student/{id}/attention
  ✓ GET /student/{id}/knowledge-graph
  ✓ GET /student/{id}/report

4. Privacy Endpoints
  ✓ GET /student/{id}/privacy
  ✓ GET /student/{id}/data-export

5. AI Endpoints (require OpenAI API key)
  ✓ POST /chat/tutor (Ask Mode)
  ✓ POST /quiz/generate-questions
  ✓ POST /quiz/generate-from-materials (Practice Mode)
  ✓ POST /quiz/assess-answer (Test Mode)
  ✓ POST /voice/analyze-understanding

═══════════════════════════════════════════
  Results: 17 passed, 0 failed, 17 total
  ALL TESTS PASSED ✓
═══════════════════════════════════════════
```

---

## 10. Manual Feature Walkthrough

Once both servers are running, test each feature in the browser:

### 10.1 — Authentication
1. Open `http://localhost:8080`
2. **Sign Up** with an email + password
3. You're redirected to the home page
4. Log out → **Sign In** → verify you return to the home page

### 10.2 — Cognitive Fingerprint (Home Page)
1. Click **Cognitive Fingerprint** in the sidebar
2. Verify: radar chart, mastery cards, study patterns, streak stats

### 10.3 — Quiz Me: Ask Mode
1. Navigate to **Quiz Me** → **Ask** tab
2. Select a topic (e.g., Biology)
3. Type: `"What is photosynthesis?"`
4. Verify: AI tutor response with explanation appears
5. Check LaTeX math renders correctly (if math is in the response)

### 10.4 — Quiz Me: Practice Mode
1. Switch to **Practice** tab
2. Paste study material text into the input area
3. Click **Generate Questions**
4. Verify: questions generated from your material
5. Answer a question → verify feedback appears

### 10.5 — Quiz Me: Test Mode
1. Switch to **Test** tab
2. Select topic and number of questions
3. Answer all questions
4. Verify: score summary with correct/incorrect breakdown

### 10.6 — Attention Monitor
1. Navigate to **Attention Monitor**
2. Click **Enable Camera**
3. Grant browser camera permission
4. Verify: live video feed with face mesh landmarks
5. Check real-time metrics: EAR, PERCLOS, blink rate, fatigue %
6. Cover eyes briefly → fatigue rises, "No face detected"
7. Uncover → face re-detected, metrics resume
8. Click **Disable Camera** → camera stops
9. Navigate away and back → camera stays off (no auto-start)
10. Check timeline chart at bottom of page

### 10.7 — Fatigue Alerts & Break Coaching
1. Enable camera, let fatigue build
2. At ~30% → yellow warning badge appears
3. At ~60% → **break suggestion modal** pops up
4. Click **5 min** or **10 min** → screen dims, timer counts down
5. Navigate to another page → alert still visible (it's global)

### 10.8 — Knowledge Graph
1. Navigate to **Knowledge Graph**
2. Verify: interactive node-and-edge graph loads
3. Hover/click nodes to see topic details

### 10.9 — Study Brief
1. Navigate to **Study Brief**
2. Verify: personalised study report with actionable insights

### 10.10 — My Data (Privacy)
1. Navigate to **My Data**
2. Verify: list of tracked data categories
3. Check which data is stored vs. never saved (webcam, audio)
4. Verify export and privacy controls

---

## 11. Generate Sample Data (Optional)

The repo ships with pre-generated data in `Model/GeneratedData/`. A copy is also in `testbench/sample_interactions.json`. To regenerate from scratch:

```bash
python3 Backend/DataGeneration_Script/Datageneration.py
```

This writes:
- `Model/GeneratedData/sample_interactions.json` — 1,200+ student interaction records
- `Model/GeneratedData/curriculum_notes.json` — 25 concept-explanation entries

---

## 12. Supabase Database Setup (Optional)

The app uses **Supabase** for authentication and (optionally) for persistent data storage. If you want to set up your own Supabase project:

1. Go to [supabase.com](https://supabase.com) → create a new project
2. Copy the **Project URL** and **anon key** into `Frontend/.env`
3. Copy the **service role key** into `Backend/.env`
4. Run the schema setup:

```bash
# Using Supabase CLI:
supabase db push < testbench/schema.sql

# Or paste the contents of testbench/schema.sql into the Supabase SQL editor
```

See `testbench/schema.sql` for the full table definitions.

> **Without Supabase:** The backend generates synthetic data per-request (deterministic by student ID). All features except auth work without a database.

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ModuleNotFoundError: No module named 'Backend'` | Running from wrong directory | Run uvicorn from the **project root**, not from inside Backend/ |
| `npm ERR! ENOENT` | Missing node_modules | Run `cd Frontend && npm install` |
| `pip: command not found` | Python not installed | Install Python 3.10+ (see section 1) |
| Backend starts but AI returns 500 | Missing or invalid `OpenAI_KEY` | Check `Backend/.env` has a valid key starting with `sk-` |
| Browser says "camera blocked" | Permission denied | Click the lock icon in the address bar → allow Camera |
| Port 8000 already in use | Another process | `lsof -i :8000` → `kill <PID>` |
| Port 8080 already in use | Another process | `lsof -i :8080` → `kill <PID>` |
| Frontend crashes on load | Missing Supabase env | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `Frontend/.env` |
| `ConnectionRefusedError` on curl | Backend crashed | Check the backend terminal for Python tracebacks |
| Face mesh doesn't detect face | Poor lighting or angle | Ensure good lighting, face the camera directly |
| `venv` not found | Virtual env not created | Run `python3 -m venv venv` in the Backend folder |
| `CORS error` in browser console | Backend not allowing origin | Backend allows all origins by default — restart it |

---

## Quick Checklist for Judges

Use this checklist to verify core functionality:

- [ ] Backend starts without errors (`python3 -m uvicorn Backend.mindmap.app:app --port 8000`)
- [ ] Frontend starts without errors (`cd Frontend && npm run dev`)
- [ ] `testbench/test_backend.py` passes (at least non-AI endpoints)
- [ ] Login/signup works
- [ ] Ask Mode returns AI tutoring response
- [ ] Practice Mode generates questions from pasted material
- [ ] Test Mode scores answers correctly
- [ ] Camera enables and detects face with landmark overlay
- [ ] Fatigue metrics update in real time
- [ ] Fatigue alert modal appears at 60% fatigue
- [ ] Break timer works (5 or 10 min)
- [ ] Knowledge Graph loads interactive visualization
- [ ] Study Brief shows personalized report
- [ ] Camera does NOT auto-start on page navigation

---

## Quick Reference

```
Project Root
├── Backend/              ← Python FastAPI server (port 8000)
│   ├── .env              ← YOUR API keys (copied from testbench/.env.example)
│   ├── requirements.txt  ← pip install -r requirements.txt
│   └── mindmap/          ← All backend modules
├── Frontend/             ← React + Vite app (port 8080)
│   ├── .env              ← Supabase + API URL
│   ├── package.json      ← npm install
│   └── src/              ← Components, pages, hooks
├── Model/                ← ML model + generated data
├── testbench/            ← Test scripts & setup docs (YOU ARE HERE)
│   ├── SETUP_AND_RUN.md  ← This file
│   ├── .env.example      ← Environment variable template
│   ├── sample_interactions.json  ← Sample data for testing
│   ├── schema.sql        ← Database table definitions
│   ├── test_backend.sh   ← Automated API tests (shell)
│   └── test_backend.py   ← Automated API tests (Python)
├── start.sh              ← One-command launcher (macOS/Linux)
└── start.bat             ← One-command launcher (Windows)
```

---

*Last updated: March 2026*
