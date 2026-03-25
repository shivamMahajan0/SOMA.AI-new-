"""
AutoML-X — Reports Route (MongoDB Version)
PDF report generation and file exports.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from backend.database import get_db
from backend.config import settings
from backend.services.report_service import generate_pdf_report

router = APIRouter(prefix="/api/projects", tags=["Reports"])


@router.get("/{project_id}/report/pdf")
def download_report(project_id: int, db=Depends(get_db)):
    """Generate and download a PDF report."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    if project.get("status") != "completed":
        raise HTTPException(400, "Training not completed yet")

    output_dir = os.path.join(settings.OUTPUT_DIR, str(project_id))
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, "report.pdf")

    results = project.get("results_data", {})
    project_data = {
        "name": project["name"],
        "target_column": project.get("target_column"),
        "task_type": project.get("task_type"),
        "profile": project.get("profile_data", {}),
        "results": results,
        "feature_importance": results.get("feature_importance", {}),
    }

    generate_pdf_report(project_data, pdf_path)

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"AutoMLX_Report_{project['name']}.pdf",
    )


@router.get("/{project_id}/export/dataset")
def download_dataset(project_id: int, db=Depends(get_db)):
    """Download the cleaned dataset."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    csv_path = os.path.join(settings.OUTPUT_DIR, str(project_id), "cleaned_dataset.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(404, "Cleaned dataset not found")

    return FileResponse(
        csv_path,
        media_type="text/csv",
        filename=f"{project['name']}_cleaned.csv",
    )


@router.get("/{project_id}/export/model")
def download_model(project_id: int, db=Depends(get_db)):
    """Download the trained model as .pkl."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    model_path = os.path.join(settings.OUTPUT_DIR, str(project_id), "best_model.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model file not found")

    return FileResponse(
        model_path,
        media_type="application/octet-stream",
        filename=f"{project['name']}_model.pkl",
    )


@router.get("/{project_id}/export/code")
def download_code(project_id: int, db=Depends(get_db)):
    """Download the reproducible pipeline code."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    code_path = os.path.join(settings.OUTPUT_DIR, str(project_id), "pipeline_code.py")
    if not os.path.exists(code_path):
        raise HTTPException(404, "Code file not found")

    return FileResponse(
        code_path,
        media_type="text/x-python",
        filename=f"{project['name']}_pipeline.py",
    )
