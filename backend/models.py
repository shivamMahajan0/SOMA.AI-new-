"""
AutoML-X — Pydantic Schemas for API Validation
MongoDB stores documents natively; these schemas validate API input/output.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================
# Project (Dataset) Schemas
# ============================================================
class ProjectCreate(BaseModel):
    name: str


class TrainingConfig(BaseModel):
    """Custom training mode configuration."""
    custom_mode: bool = False
    model_name: Optional[str] = None  # Random Forest, XGBoost, etc.
    features: Optional[List[str]] = None
    hyperparameters: Optional[Dict[str, Any]] = None


class ProjectDoc(BaseModel):
    """MongoDB document shape for a project."""
    id: int
    name: str
    filename: str
    file_type: str = "csv"  # csv or pdf
    target_column: Optional[str] = None
    task_type: Optional[str] = None
    status: str = "created"
    num_rows: Optional[int] = None
    num_features: Optional[int] = None
    profile_data: Optional[Dict[str, Any]] = None
    results_data: Optional[Dict[str, Any]] = None
    feature_schema: Optional[Dict[str, Any]] = None
    best_model_name: Optional[str] = None
    best_model_score: Optional[float] = None
    code_generated: Optional[str] = None
    is_deployed: bool = False
    training_config: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Document (PDF) Schemas
# ============================================================
class DocumentDoc(BaseModel):
    """MongoDB document shape for an uploaded PDF."""
    id: int
    name: str
    filename: str
    status: str = "processing"
    page_count: Optional[int] = None
    extracted_text: Optional[str] = None
    tables: Optional[List[Dict[str, Any]]] = None
    charts: Optional[List[Dict[str, Any]]] = None
    ai_summary: Optional[str] = None
    embeddings_stored: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Chat Schemas
# ============================================================
class ChatRequest(BaseModel):
    message: str


class ChatMessageDoc(BaseModel):
    """MongoDB document shape for a chat message."""
    id: int
    project_id: Optional[int] = None
    document_id: Optional[int] = None
    source_type: str = "project"  # "project" or "document"
    role: str  # "user" or "assistant"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# User Schemas
# ============================================================
class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserDoc(BaseModel):
    """MongoDB document shape for a user."""
    id: int
    name: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserActivityDoc(BaseModel):
    """MongoDB document shape for user activity."""
    id: int
    user_id: int
    action: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Model Version Schemas
# ============================================================
class ModelVersionDoc(BaseModel):
    """MongoDB document shape for a model version."""
    id: int
    project_id: int
    version: int = 1
    model_name: str
    metrics: Optional[Dict[str, Any]] = None
    is_best: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# PDF to Video Schemas
# ============================================================
class PdfVideoRecord(BaseModel):
    """MongoDB document shape for a PDF to Video generation record."""
    id: int
    user_id: Optional[int] = None
    filename: str
    file_path: str
    extracted_text: Optional[str] = None
    summary_scenes: Optional[str] = None
    video_id: Optional[str] = None
    video_url: Optional[str] = None
    status: str = "uploading"  # uploading, processing, completed, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================
# AI Project Generator Schemas
# ============================================================
class ProjectGenerationRequest(BaseModel):
    prompt: str

class GeneratedProjectDoc(BaseModel):
    """MongoDB document shape for an AI Generated Project"""
    id: str  # We'll use uuid or generated string id
    project_name: str
    user_prompt: str
    file_count: int
    download_link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================
# Content Summarizer Schemas
# ============================================================
class SummaryRequest(BaseModel):
    source_type: str  # "pdf", "web", "document", "youtube"
    source_url: Optional[str] = None

class SummaryDoc(BaseModel):
    """MongoDB document shape for a generated summary"""
    id: int
    user_id: Optional[int] = None
    source_type: str
    source_name: str
    source_url: Optional[str] = None
    overview: str
    detailed_summary: str
    key_points: List[str]
    important_concepts: List[str]
    action_items: List[str]
    short_summary: str
    processing_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================
# Research Agent Schemas
# ============================================================
class ResearchSourceDoc(BaseModel):
    id: int
    project_id: int
    source_type: str  # "url", "pdf", "youtube", "document"
    source_url: str
    source_name: str
    extracted_text: Optional[str] = None
    relevance_score: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ResearchProjectDoc(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    topic: str
    status: str = "planning"  # planning, searching, extracting, summarizing, completed, failed
    sources_count: int = 0
    search_queries: Optional[List[str]] = None
    final_report: Optional[str] = None
    short_summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
