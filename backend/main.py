"""
SOMA.AI — FastAPI Application Entry Point
"""
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from backend.config import settings
from backend.database import init_db

from backend.routes import (
    projects, training, prediction, reports, copilot,
    drift, deploy, auth, report_ai, documents, pdf_video,
    project_generator, summarizer, research
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SOMA.AI — Intelligent Machine Learning & AI Platform",
    lifespan=lifespan,
)

# CORS (wide-open in dev; tighten in production if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ──────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(training.router)
app.include_router(prediction.router)
app.include_router(reports.router)
app.include_router(copilot.router)
app.include_router(drift.router)
app.include_router(deploy.router)
app.include_router(report_ai.router)
app.include_router(documents.router)
app.include_router(pdf_video.router)
app.include_router(project_generator.router)
app.include_router(summarizer.router)
app.include_router(research.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


# ── Serve React SPA (production only) ───────────────────────────────────────
if FRONTEND_DIST.exists():
    # Serve static assets (JS, CSS, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str, request: Request):
        """Return index.html for all non-API routes so React Router works."""
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
