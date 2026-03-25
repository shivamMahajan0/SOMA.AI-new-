SOMA.AI

AI Multi-Agent Platform for Machine Learning, Research, Summarization, and Project Generation

SOMA.AI is an AI-powered multi-agent platform that automates complex technical and research workflows. The platform provides multiple specialized AI agents that can perform tasks such as automated machine learning, document summarization, research report generation, prompt-to-project code generation, and prompt-to-video creation — all from a single interface.

Instead of using multiple tools separately, SOMA.AI allows users to select an AI agent and complete end-to-end workflows in minutes.

Quick Start (Local Development)
Prerequisites
Python 3.10+
Node.js 18+
pip
npm
Docker (optional)
1. Backend Setup
# From project root
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Start backend
uvicorn backend.main:app --reload --port 8000
2. Frontend Setup
cd frontend
npm install
npm run dev

Frontend runs at:

http://localhost:3000

Backend runs at:

http://localhost:8000
Docker Deployment
# Copy environment file
cp .env.example .env

# Build and run containers
docker-compose up --build -d

# Access application
http://localhost:8000
Environment Variables
Variable	Description	Required
OPENROUTER_API_KEY	API key for LLM agents	Yes
OPENROUTER_MODEL	LLM model to use	Optional
DATABASE_URL	SQLite database	Auto
Platform Architecture
backend/
├── main.py
├── config.py
├── database.py
├── models.py
├── routes/
├── services/
├── agents/
│   ├── automl_agent/
│   ├── summary_agent/
│   ├── research_agent/
│   ├── project_agent/
│   └── video_agent/

frontend/src/
├── App.jsx
├── api.js
├── components/
├── pages/
SOMA.AI Agents
1. AutoML Agent
Upload dataset
Automatic EDA
Data preprocessing
Multi-model training
Hyperparameter tuning
Model evaluation
SHAP explainability
Model deployment API
2. Summary Agent
PDF → Summary
Website → Summary
Document → Summary
YouTube → Summary
Research paper → Summary
3. Research Agent
Topic → Full research report
Literature review
Methodology
Findings
References
Export report
4. Prompt to Project Agent
Prompt → Full code project
Backend + Frontend generation
Folder structure
Requirements
Documentation
5. Prompt to Video Agent
Prompt → Video script
Scene generation
Voiceover text
Video generation pipeline
Features
Multi-Agent AI Platform
Automated Machine Learning
AI Research Report Generation
Document & Web Summarization
Prompt to Full Project Generation
Prompt to Video Generation
LLM Copilot Assistant
PDF Report Generation
Model Deployment API
Data Drift Detection
Model Versioning
Docker Deployment
Full Stack Platform (FastAPI + React)
Tech Stack
Layer	Technology
Backend	FastAPI
Frontend	React + Vite
Database	SQLite
AI Models	OpenRouter / LLM APIs
ML	Scikit-learn, XGBoost
Explainability	SHAP
Deployment	Docker
Agents	LangChain / Custom Agents
Future Roadmap
Voice AI Agent
Auto Data Cleaning Agent
AI Presentation Generator
AI Dashboard Generator
Multi-Agent Workflow Automation
Cloud Deployment
Team Collaboration
API Marketplace
Vision

SOMA.AI aims to become an AI productivity operating system where multiple AI agents automate complex human tasks such as machine learning, research, content creation, and software development.

Author

Shivam Mahajan

License

MIT License

---

## License

MIT
