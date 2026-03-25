"""
AutoML-X — Project CRUD Routes (MongoDB Version)
"""

import os
import shutil
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException

from backend.database import get_db, get_next_id
from backend.config import settings
from backend.ml_engine.profiler import detect_task_type

router = APIRouter(prefix="/api/projects", tags=["Projects"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)


# =========================================================
# LIST ALL PROJECTS
# =========================================================
@router.get("")
def list_projects(db=Depends(get_db)):
    """List all projects."""
    projects = list(db.projects.find().sort("created_at", -1))
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "filename": p["filename"],
            "file_type": p.get("file_type", "csv"),
            "num_rows": p.get("num_rows"),
            "num_features": p.get("num_features"),
            "status": p.get("status"),
            "task_type": p.get("task_type"),
            "best_model_name": p.get("best_model_name"),
            "best_model_score": p.get("best_model_score"),
            "created_at": str(p.get("created_at", "")),
        }
        for p in projects
    ]


# =========================================================
# CREATE PROJECT
# =========================================================
@router.post("")
async def create_project(
    name: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_db),
):
    if not name.strip():
        raise HTTPException(status_code=400, detail="Project name is required")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ("csv", "pdf"):
        raise HTTPException(status_code=400, detail="Only CSV and PDF files are supported")

    file_type = "pdf" if ext == "pdf" else "csv"
    project_id = get_next_id("projects")

    project_doc = {
        "id": project_id,
        "name": name.strip(),
        "filename": file.filename,
        "file_type": file_type,
        "status": "created",
        "num_rows": None,
        "num_features": None,
        "target_column": None,
        "task_type": None,
        "profile_data": None,
        "results_data": None,
        "feature_schema": None,
        "best_model_name": None,
        "best_model_score": None,
        "code_generated": None,
        "is_deployed": False,
        "training_config": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    db.projects.insert_one(project_doc)

    project_dir = os.path.join(settings.UPLOAD_DIR, str(project_id))
    os.makedirs(project_dir, exist_ok=True)

    file_path = os.path.join(project_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if file_type == "csv":
            df = pd.read_csv(file_path)
            db.projects.update_one(
                {"id": project_id},
                {"$set": {
                    "num_rows": len(df),
                    "num_features": len(df.columns),
                    "updated_at": datetime.utcnow(),
                }}
            )
            return {
                "id": project_id,
                "file_type": "csv",
                "columns": df.columns.tolist(),
                "num_rows": len(df),
                "num_features": len(df.columns),
            }
        else:
            # PDF file — return basic info, processing happens via /api/documents
            return {
                "id": project_id,
                "file_type": "pdf",
                "filename": file.filename,
            }

    except Exception as e:
        db.projects.update_one(
            {"id": project_id},
            {"$set": {"status": "failed", "updated_at": datetime.utcnow()}}
        )
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        raise HTTPException(
            status_code=400,
            detail=f"Error processing file: {str(e)}",
        )


# =========================================================
# GET SINGLE PROJECT
# =========================================================
@router.get("/{project_id}")
def get_project(project_id: int, db=Depends(get_db)):
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": project["id"],
        "name": project["name"],
        "filename": project["filename"],
        "file_type": project.get("file_type", "csv"),
        "num_rows": project.get("num_rows"),
        "num_features": project.get("num_features"),
        "status": project.get("status"),
        "task_type": project.get("task_type"),
        "target_column": project.get("target_column"),
        "best_model_name": project.get("best_model_name"),
        "best_model_score": project.get("best_model_score"),
        "profile": project.get("profile_data", {}),
        "results": project.get("results_data", {}),
        "code_generated": project.get("code_generated"),
        "is_deployed": project.get("is_deployed", False),
        "training_config": project.get("training_config"),
    }


# =========================================================
# DELETE PROJECT
# =========================================================
@router.delete("/{project_id}")
def delete_project(project_id: int, db=Depends(get_db)):
    """Delete a project and clean up all associated files."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clean up upload files
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(project_id))
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)

    # Clean up output files
    output_dir = os.path.join(settings.OUTPUT_DIR, str(project_id))
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)

    # Delete related data
    db.chat_messages.delete_many({"project_id": project_id})
    db.model_versions.delete_many({"project_id": project_id})
    db.projects.delete_one({"id": project_id})

    return {"message": "Project deleted successfully"}


# =========================================================
# UPDATE TARGET COLUMN
# =========================================================
@router.put("/{project_id}/target")
def update_target(
    project_id: int,
    target_column: str = Form(...),
    db=Depends(get_db),
):
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not target_column.strip():
        raise HTTPException(status_code=400, detail="Target column is required")

    file_path = os.path.join(
        settings.UPLOAD_DIR,
        str(project_id),
        project["filename"],
    )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")

    try:
        df = pd.read_csv(file_path)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read dataset")

    if target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{target_column}' not found in dataset",
        )

    task_type = detect_task_type(df, target_column)
    db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "target_column": target_column,
            "task_type": task_type,
            "updated_at": datetime.utcnow(),
        }}
    )

    return {
        "target_column": target_column,
        "task_type": task_type,
    }


# =========================================================
# GET DATASET PREVIEW (first 10 rows)
# =========================================================
@router.get("/{project_id}/preview")
def get_preview(project_id: int, db=Depends(get_db)):
    """Return the first 10 rows of the dataset."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = os.path.join(settings.UPLOAD_DIR, str(project_id), project["filename"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")

    try:
        df = pd.read_csv(file_path, nrows=10)
        return {
            "columns": df.columns.tolist(),
            "rows": df.head(10).fillna("").values.tolist(),
            "total_rows": project.get("num_rows"),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading dataset: {str(e)}")