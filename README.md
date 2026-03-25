# AutoML-X

**AI-Powered Automated Machine Learning Platform**

AutoML-X lets you upload structured datasets and automatically performs EDA, preprocessing, multi-model training with hyperparameter tuning, evaluation, SHAP explainability, and one-click deployment — all from a single interface.

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- pip, npm

### 1. Backend Setup

```bash
# From project root
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY (optional, for AI Copilot)

# Start backend
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000` and proxies API calls to the backend at `:8000`.

---

## Docker Deployment

```bash
# Copy env and set your API key
cp .env.example .env

# Build and run
docker-compose up --build -d

# Access at http://localhost:8000
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI Copilot | Optional |
| `OPENROUTER_MODEL` | LLM model to use (default: `openai/gpt-4o-mini`) | Optional |
| `DATABASE_URL` | SQLite connection string | Auto |

---

## Architecture

```
backend/
├── main.py          # FastAPI entry point
├── config.py        # Settings
├── database.py      # SQLAlchemy + SQLite
├── models.py        # DB models
├── routes/          # API endpoints (7 modules)
├── ml_engine/       # ML pipeline (6 modules)
└── services/        # LLM + PDF services

frontend/src/
├── App.jsx          # Router
├── api.js           # API client
├── components/      # Navbar
└── pages/           # 8 page components
```

## Features

- **Smart EDA**: Missing values, correlations, distributions, outliers, skewness
- **Multi-Model Training**: 8+ algorithms (RF, XGBoost, LightGBM, SVM, etc.)
- **Hyperparameter Tuning**: RandomizedSearchCV with cross-validation
- **Model Explainability**: SHAP global + local explanations
- **AI Copilot**: LLM assistant with full project context
- **One-Click API**: Deploy model as REST endpoint
- **PDF Reports**: Auto-generated training reports
- **Data Drift**: KS-test based drift detection
- **Model Versioning**: Track and compare model versions
- **Reproducible Code**: Full pipeline code generation

---

## License

MIT
