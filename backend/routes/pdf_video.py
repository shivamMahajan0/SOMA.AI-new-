"""
AutoML-X — PDF to Video Routes
API endpoints for uploading PDFs, checking status, and receiving the KIE AI webhook.
"""
import os
import shutil
from fastapi import APIRouter, File, UploadFile, BackgroundTasks, HTTPException
from backend.models import PdfVideoRecord
from backend.mongo_db import get_db, get_next_id
from backend.services.video_service import process_pdf_video_workflow
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/pdf-video", tags=["PDF to Video"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class WebhookPayload(BaseModel):
    video_id: str
    video_url: str
    status: str
    error: Optional[str] = None


@router.post("/upload")
async def upload_pdf_for_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload a PDF document to generate an AI Video."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    db = get_db()
    
    # Save file
    safe_filename = file.filename.replace(" ", "_").replace("/", "")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB record
    record_id = get_next_id("pdf_videos")
    new_record = PdfVideoRecord(
        id=record_id,
        filename=file.filename,
        file_path=file_path,
        status="uploading"
    )
    
    db.pdf_videos.insert_one(new_record.model_dump())
    
    # Start background task
    background_tasks.add_task(process_pdf_video_workflow, record_id)
    
    return {"message": "PDF uploaded successfully. Processing started.", "fileId": record_id}


@router.get("/status/{file_id}")
def get_pdf_video_status(file_id: int):
    """Check the status of a scheduled or processing video."""
    db = get_db()
    record = list(db.pdf_videos.find({"id": file_id}))
    
    if not record:
        raise HTTPException(status_code=404, detail="File ID not found")
        
    record = record[0]
    return {
        "status": record.get("status"), 
        "videoUrl": record.get("video_url"),
        "error": record.get("error"),
        "summaryScenes": record.get("summary_scenes")
    }


@router.post("/webhook")
async def webhook_kie_ai_completion(payload: WebhookPayload):
    """Webhook for KIE AI completion."""
    db = get_db()
    record = list(db.pdf_videos.find({"video_id": payload.video_id}))
    
    if not record:
        print(f"[Webhook Warning] Received webhook for unknown video_id: {payload.video_id}")
        return {"message": "Video ID not found"}
        
    record_id = record[0]["id"]
    
    update_data = {
        "status": payload.status,
    }
    
    if payload.video_url:
        update_data["video_url"] = payload.video_url
        update_data["status"] = "completed"
    if payload.error:
        update_data["error"] = payload.error
        update_data["status"] = "failed"
        
    db.pdf_videos.update_one({"id": record_id}, {"$set": update_data})
    print(f"[Webhook] Updated record {record_id} to status {update_data['status']}")
    
    return {"message": "Successfully updated status from webhook"}
