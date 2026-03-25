"""
AutoML-X — Drift Detection Route (MongoDB Version)
"""
import os
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException

from backend.database import get_db
from backend.config import settings
from backend.ml_engine.drift import detect_drift

router = APIRouter(prefix="/api/projects", tags=["Drift"])


@router.post("/{project_id}/drift")
async def check_drift(
    project_id: int,
    file: UploadFile = File(...),
    db=Depends(get_db),
):
    """Upload new data and check for distribution drift against training data."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    if project.get("status") != "completed":
        raise HTTPException(400, "Model not trained yet")

    # Read training data
    train_path = os.path.join(settings.UPLOAD_DIR, str(project_id), project["filename"])
    train_df = pd.read_csv(train_path)

    # Read new data
    try:
        content = await file.read()
        import io
        new_df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Error reading uploaded file: {str(e)}")

    # Get numeric features
    profile = project.get("profile_data", {})
    numeric_features = profile.get("numeric_columns", [])

    if not numeric_features:
        numeric_features = list(train_df.select_dtypes(include=["number"]).columns)
        target = project.get("target_column")
        if target and target in numeric_features:
            numeric_features.remove(target)

    results = detect_drift(train_df, new_df, numeric_features)
    return results
