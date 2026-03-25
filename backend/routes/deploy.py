"""
AutoML-X — API Deployment Route (MongoDB Version)
One-click model deployment as REST API.
"""
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException

from backend.database import get_db
from backend.config import settings

router = APIRouter(prefix="/api/projects", tags=["Deploy"])


@router.post("/{project_id}/deploy")
def deploy_model(project_id: int, db=Depends(get_db)):
    """Mark a project model as deployed."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    if project.get("status") != "completed":
        raise HTTPException(400, "Training not completed")

    model_path = os.path.join(settings.OUTPUT_DIR, str(project_id), "best_model.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model file not found")

    db.projects.update_one(
        {"id": project_id},
        {"$set": {"is_deployed": True, "updated_at": datetime.utcnow()}}
    )

    return {
        "message": "Model deployed successfully",
        "endpoint": f"/api/projects/{project_id}/predict",
        "is_deployed": True,
    }


@router.get("/{project_id}/api-docs")
def get_api_docs(project_id: int, db=Depends(get_db)):
    """Get API documentation for the deployed model."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    schema = project.get("feature_schema", {})

    example_features = {}
    for feature_name, feature_info in schema.items():
        if feature_info.get("type") == "numeric":
            example_features[feature_name] = feature_info.get("mean", 0)
        elif feature_info.get("type") == "categorical":
            cats = feature_info.get("categories", [])
            example_features[feature_name] = cats[0] if cats else "value"

    return {
        "project_name": project["name"],
        "model": project.get("best_model_name"),
        "task_type": project.get("task_type"),
        "endpoint": f"/api/projects/{project_id}/predict",
        "method": "POST",
        "content_type": "application/json",
        "request_body": {
            "features": example_features,
        },
        "example_curl": (
            f'curl -X POST http://localhost:8000/api/projects/{project_id}/predict '
            f'-H "Content-Type: application/json" '
            f'-d \'{{"features": {example_features}}}\''
        ),
        "feature_schema": schema,
        "is_deployed": project.get("is_deployed", False),
    }


@router.get("/{project_id}/versions")
def get_model_versions(project_id: int, db=Depends(get_db)):
    """Get all model versions for a project."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    versions = list(
        db.model_versions.find({"project_id": project_id}).sort("version", -1)
    )

    return [
        {
            "id": v["id"],
            "version": v["version"],
            "model_name": v.get("model_name"),
            "is_best": v.get("is_best", False),
            "metrics": v.get("metrics", {}),
            "created_at": str(v.get("created_at", "")),
        }
        for v in versions
    ]
