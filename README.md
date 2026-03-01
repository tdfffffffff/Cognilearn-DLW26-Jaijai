# CogniLearn

A cognitive AI study companion for university students. CogniLearn diagnoses why students get answers wrong, personalises forgetting curves per topic, detects real-time attention and fatigue, generates daily optimised study briefs, and explains concepts via voice-triggered RAG.

**Stack:** React (Vite + TypeScript) · FastAPI (Python) · Supabase (PostgreSQL) · OpenAI GPT-4o

---

## Repository Structure

```
├── Frontend/       # React + Vite + TypeScript frontend
├── Backend/        # FastAPI Python backend
├── Model/          # Jupyter notebook + trained ML models
└── PLAN.md         # Full implementation plan
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x or later |
| npm | 9.x or later |
| Python | 3.10 or later |
| pip | 23.x or later |

---

## Frontend Setup

The frontend is a React + Vite + TypeScript app using Tailwind CSS, shadcn/ui, and Supabase Auth.

### 1. Navigate to the frontend directory

```bash
cd Frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `Frontend/` directory (copy from `.env.example` if present):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

| Variable | Where to find it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` key |

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:8080` (or the port printed in the terminal).

### Other frontend scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Production build (output to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |

---

## Backend Setup

The backend is a FastAPI Python app. All AI logic (error classification, forgetting curves, attention monitoring, knowledge graphs, voice RAG) lives here.

### 1. Navigate to the backend directory

```bash
cd Backend
```

### 2. Create and activate a virtual environment (recommended)

MAKE SURE ITS PYTHON 3.13.7

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

> **Note:** `torch` is included in `requirements.txt` and may take several minutes to install. If you only need CPU support, you can install the CPU-only build first to save time:
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> ```

### 4. Configure environment variables

Create a `.env` file in the `Backend/` directory:

```env
OpenAI_KEY=your_openai_api_key
```

| Variable | Where to find it |
|----------|-----------------|
| `OpenAI_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys |

### 5. Start the FastAPI server

```bash
uvicorn mindmap.app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs (Swagger UI): `http://localhost:8000/docs`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/student/{id}/dashboard` | Full 4-agent pipeline |
| `GET` | `/student/{id}/diagnose` | Error classification (XGBoost + SHAP) |
| `GET` | `/student/{id}/temporal` | Forgetting curves + momentum |
| `GET` | `/student/{id}/attention` | Attention stats + adaptive Pomodoro break |
| `GET` | `/student/{id}/knowledge-graph` | Knowledge graph with risk propagation |
| `POST` | `/student/{id}/voice/{topic_id}` | Voice concept gap analysis |
| `GET` | `/student/{id}/report` | Daily study report |
| `GET` | `/student/{id}/privacy` | Data transparency |
| `DELETE` | `/student/{id}/privacy` | GDPR data purge |
| `PUT` | `/student/{id}/privacy/auto-delete` | Configure auto-delete schedule |
| `GET` | `/student/{id}/data-export` | Export student data as JSON |
| `GET` | `/demo/aisha` | Demo profile — Aisha |
| `GET` | `/demo/marcus` | Demo profile — Marcus |

---

## ML Model (Optional) Only DAN FENG NEED

The `Model/` directory contains the Jupyter notebook used to train the XGBoost error classifier and generate synthetic data.

### Setup

```bash
cd Model
pip install -r requirements.txt
```

Then open `DLW_Model.ipynb` in Jupyter or VS Code. Pre-trained model artifacts are already saved in `Model/models/` and referenced by the backend automatically.

---

## Running Frontend and Backend Together

Open two terminals side by side:

**Terminal 1 — Backend:**
```bash
cd Backend
.\venv\Scripts\Activate.ps1   # Windows
uvicorn mindmap.app:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd Frontend
npm run dev
```

The frontend dev server proxies API calls to the backend. Make sure both servers are running before testing the full application.

---

## Environment Variable Reference

### `Frontend/.env`

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### `Backend/.env`

```env
OpenAI_KEY=<your-openai-api-key>
```

> **Security:** Never commit `.env` files to version control. Both are already listed in `.gitignore`.
