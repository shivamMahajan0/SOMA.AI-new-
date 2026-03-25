# ===================================================================
# SOMA.AI — Multi-stage Dockerfile
# Stage 1: Build React frontend
# Stage 2: Python backend serves frontend static files via FastAPI
# ===================================================================

# -- Stage 1: Build frontend --
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# -- Stage 2: Python backend --
FROM python:3.11-slim
WORKDIR /app

# Install system deps for pdfplumber, PyMuPDF, and other native libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./backend/

# Copy built frontend dist
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create upload/output directories
RUN mkdir -p uploads outputs

# Expose port
EXPOSE 8000

# Runtime environment defaults (override via docker-compose env_file or -e flags)
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV OPENROUTER_API_KEY=""
ENV OPENROUTER_MODEL="openai/gpt-4o-mini"
ENV GEMINI_API_KEY=""
ENV TAVILY_API_KEY=""

# Run
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
