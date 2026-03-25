from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import ValidationError

from backend.models import ProjectGenerationRequest
from backend.services.project_generator_service import generate_project_from_prompt, get_project_zip_path

router = APIRouter(prefix="/api/project-generator", tags=["AI Project Generator"])

@router.post("/generate")
async def generate_project(request: ProjectGenerationRequest):
    """
    Takes a natural language prompt and returns a complete zipped project structure.
    """
    try:
        result = await generate_project_from_prompt(request.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{project_id}")
async def download_project(project_id: str):
    """
    Returns the ZIP file for the given project_id.
    """
    zip_path = get_project_zip_path(project_id)
    if not zip_path:
        raise HTTPException(status_code=404, detail="Project ZIP not found.")
        
    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=zip_path.split("\\")[-1].split("/")[-1]
    )
