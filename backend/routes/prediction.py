"""
AutoML-X — Prediction Route (MongoDB Version)
Real-time prediction using the trained model.
"""
import os
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from backend.database import get_db
from backend.config import settings
from backend.ml_engine.explainer import explain_prediction

router = APIRouter(prefix="/api/projects", tags=["Prediction"])


class PredictionRequest(BaseModel):
    features: Dict[str, Any]


@router.get("/{project_id}/schema")
def get_feature_schema(project_id: int, db=Depends(get_db)):
    """Get the feature schema for building a dynamic prediction form."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    if project.get("status") != "completed":
        raise HTTPException(400, "Model not trained yet")

    schema = project.get("feature_schema", {})
    return {
        "schema": schema,
        "target_column": project.get("target_column"),
        "task_type": project.get("task_type"),
    }


@router.post("/{project_id}/predict")
def predict(
    project_id: int,
    request: PredictionRequest,
    db=Depends(get_db),
):
    """Make a prediction using the trained model."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    if project.get("status") != "completed":
        raise HTTPException(400, "Model not trained yet")

    model_path = os.path.join(settings.OUTPUT_DIR, str(project_id), "best_model.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model file not found")

    pipeline = joblib.load(model_path)

    try:
        input_df = pd.DataFrame([request.features])
        prediction = pipeline.predict(input_df)
        result: Dict[str, Any] = {"prediction": _format_prediction(prediction[0])}

        if hasattr(pipeline, "predict_proba"):
            try:
                proba = pipeline.predict_proba(input_df)
                result["confidence"] = round(float(np.max(proba[0])), 4)
                result["probabilities"] = {
                    str(cls): round(float(p), 4)
                    for cls, p in zip(pipeline.classes_, proba[0])
                }
            except Exception:
                result["confidence"] = None

        # SHAP local explanation
        try:
            file_path = os.path.join(settings.UPLOAD_DIR, str(project_id), project["filename"])
            train_df = pd.read_csv(file_path)
            X_bg = train_df.drop(columns=[project["target_column"]]).head(50)
            shap_result = explain_prediction(
                pipeline, input_df, list(input_df.columns), X_bg
            )
            result["shap_local"] = shap_result.get("shap_local", {})
        except Exception as e:
            result["shap_local_error"] = str(e)

        return result

    except Exception as e:
        raise HTTPException(400, f"Prediction error: {str(e)}")


def _format_prediction(value):
    """Format prediction value for JSON serialization."""
    if isinstance(value, (np.integer,)):
        return int(value)
    elif isinstance(value, (np.floating,)):
        return round(float(value), 4)
    return str(value)
