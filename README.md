# WindIQ — Wind Power Intelligence Platform

> A full-stack web application for UK energy traders to monitor, compare, and evaluate wind power generation forecasts against actuals — supporting day-ahead electricity market procurement decisions.

**Built with:** React · FastAPI · Docker · Recharts · Elexon BMRS API

> ⚠️ **AI Disclosure:** This application was built with the assistance of AI tools (Antigravity AI coding assistant by Google DeepMind). All architecture decisions, business logic, and domain-specific choices (e.g., gate-closure logic, procurement gap model) were manually reviewed and validated.

---

## 🌐 Live Application

| Service  | URL |
|----------|-----|
| Frontend | `https://<your-vercel-app>.vercel.app` |
| Backend API | `https://<your-render-app>.onrender.com` |
| API Docs | `https://<your-render-app>.onrender.com/api/docs` |

---

## 🗂️ Repository Structure

```
.
├── backend/                        # Python FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── actuals.py      # GET /api/v1/actuals — FUELHH wind actuals
│   │   │       ├── forecasts.py    # GET /api/v1/forecasts — WINDFOR snapshot & DA selection
│   │   │       ├── metrics.py      # GET /api/v1/metrics  — MAE, RMSE, MAPE, Bias
│   │   │       └── health.py       # GET /api/v1/health   — liveness probe
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic settings (env-based)
│   │   │   └── cache.py            # In-memory TTL cache
│   │   ├── schemas/
│   │   │   └── responses.py        # Pydantic response models
│   │   ├── services/
│   │   │   ├── elexon_client.py    # Async BMRS API client with retry
│   │   │   └── analytics.py        # Core accuracy computation logic
│   │   └── __init__.py
│   ├── main.py                     # FastAPI app entry point
│   ├── requirements.txt            # Pinned Python dependencies
│   ├── Dockerfile                  # Backend container (non-root, health-checked)
│   └── .env.example                # Environment variable template
│
├── frontend/                       # React (Vite) frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── elexon.js           # Axios API client
│   │   ├── components/
│   │   │   ├── ChartTooltip.jsx    # Custom Recharts tooltip
│   │   │   ├── DateRangePicker.jsx # Date range selector
│   │   │   ├── KpiCard.jsx         # KPI metric card
│   │   │   └── Sidebar.jsx         # Navigation sidebar
│   │   ├── hooks/
│   │   │   └── useWindData.js      # React Query data-fetching hooks
│   │   ├── pages/
│   │   │   ├── OverviewPage.jsx    # Executive dashboard
│   │   │   ├── ActualsPage.jsx     # FUELHH generation viewer
│   │   │   ├── ForecastsPage.jsx   # WINDFOR forecast viewer
│   │   │   └── AccuracyPage.jsx    # Forecast accuracy analytics
│   │   ├── App.jsx                 # Root component + client-side routing
│   │   ├── index.css               # Global design system (CSS custom properties)
│   │   └── main.jsx                # React entry point (React Query Provider)
│   ├── index.html                  # HTML entry point with SEO meta tags
│   ├── vite.config.js              # Vite config with dev proxy
│   ├── nginx.conf                  # nginx SPA + API proxy config
│   ├── Dockerfile                  # Multi-stage build (Node builder + nginx)
│   └── .env.example                # Frontend env template
│
├── docker-compose.yml              # Compose: backend + frontend + network
├── .gitignore
└── README.md
```

---

## ⚡ How to Start the Application

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/<user>/<repo>.git
cd <repo>

# Start everything
docker compose up --build

# Access the app
open http://localhost       # Frontend
open http://localhost:8000/api/docs  # API Swagger docs
```

### Option 2: Local Development (without Docker)

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Start the API server
uvicorn main:app --reload --port 8000
```

Backend available at: `http://localhost:8000`
API docs at: `http://localhost:8000/api/docs`

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env.local
# Set: VITE_API_URL=http://localhost:8000/api/v1

# Start Vite dev server
npm run dev
```

Frontend available at: `http://localhost:5173`

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Liveness check + Elexon reachability |
| `GET` | `/api/v1/actuals?from=&to=` | Actual wind generation (FUELHH/WIND) |
| `GET` | `/api/v1/forecasts?from=&to=` | Latest WINDFOR forecast snapshot |
| `GET` | `/api/v1/forecasts/day-ahead?from=&to=` | Gate-closure-aware DA forecast selection |
| `GET` | `/api/v1/metrics?from=&to=` | MAE, RMSE, MAPE, Bias + period pairs |

All endpoints default to `from=2026-01-01&to=2026-01-31` (January 2026 scope).

Full interactive docs: `/api/docs` (Swagger UI)

---

## 🧠 Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser Client                   │
│    React + Vite + Recharts + React Query            │
└───────────────────────────┬─────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼─────────────────────────┐
│              FastAPI Backend (Python)               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Actuals API │  │ Forecasts API│  │ Metrics   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         └─────────────────┴────────────────┘        │
│              Elexon Client (httpx + tenacity)        │
│              In-Memory Cache (5-min TTL)             │
└───────────────────────────┬─────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼─────────────────────────┐
│            Elexon BMRS Data API                     │
│   FUELHH stream (actuals)  WINDFOR stream (fcast)   │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Gate closure logic** | Day-ahead selection uses publishTime < D-1 11:00 UTC to replicate real trader information set |
| **In-memory TTL cache** | 5-min cache avoids hammering Elexon API; Redis not needed for pilot scale |
| **Concurrent fetching** | `asyncio.gather` fetches actuals + forecasts in parallel on the metrics endpoint |
| **React Query** | Declarative data fetching with automatic caching, retry, and stale-time management |
| **nginx reverse proxy** | Single-port deployment; frontend container proxies `/api/` to the backend service |

---

## 📊 Accuracy Metrics Explained

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **MAE** | mean(|forecast − actual|) | Average absolute error in MW |
| **RMSE** | √mean((forecast − actual)²) | Penalises large errors more; in MW |
| **MAPE** | mean(|error|/|actual|) × 100 | Scale-independent; % |
| **Bias** | mean(forecast − actual) | Positive = systematic over-forecast |

---

## 🚀 Deployment

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect to this GitHub repo, set **Root directory** to `backend/`
3. Runtime: **Python 3.12**; Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `backend/.env.example`

### Frontend → Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Set **Root directory** to `frontend/`
3. Build command: `npm run build`; Output directory: `dist`
4. Set environment variable: `VITE_API_URL=https://<your-render-backend>.onrender.com/api/v1`

---

## 📋 Data Sources

- **Actuals:** [Elexon BMRS FUELHH stream](https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream) — `fuelType=WIND`
- **Forecasts:** [Elexon BMRS WINDFOR stream](https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream)
- **Scope:** January 2026 (configurable via `from` / `to` query parameters)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 (Vite) |
| Charts | Recharts |
| Data fetching | React Query (TanStack) |
| HTTP client (FE) | Axios |
| Backend framework | FastAPI (Python 3.12) |
| HTTP client (BE) | httpx (async) |
| Retry logic | tenacity |
| Data validation | Pydantic v2 |
| Containerisation | Docker + Docker Compose |
| Web server | nginx (alpine) |
| Deployment | Render (backend) + Vercel (frontend) |
