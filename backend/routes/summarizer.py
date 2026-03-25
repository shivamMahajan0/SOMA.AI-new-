import os
import shutil
from fastapi import APIRouter, Form, UploadFile, File, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from backend.config import settings
from backend.mongo_db import get_db, get_next_id
from backend.services.content_loader import process_input
from backend.services.summarizer_service import summarize_content
from backend.models import SummaryDoc

router = APIRouter(prefix="/api/summarizer", tags=["Summarizer"])

@router.post("/process")
async def process_summary(
    request: Request,
    source_type: str = Form(...),
    source_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Process content from a file or URL, extract text, and run the LLM summarized.
    """
    # 1. Provide Context for ContentLoader
    db = get_db()
    
    # Use Gemini key from settings for audio fallback, with dynamic fallback to os.getenv
    kwargs = {}
    if source_type == "youtube":
        kwargs["gemini_api_key"] = settings.GEMINI_API_KEY

    # 2. Extract Text
    extracted_text = ""
    processing_metadata = {}
    source_name = source_url if source_url else "Uploaded Document"

    try:
        if source_type in ["web", "document", "youtube"]:
            if not source_url:
                raise ValueError(f"source_url is required for type {source_type}")
            extracted_text, metadata = process_input(source_type, source_url, kwargs)
            processing_metadata.update(metadata)
            
            # Simple name extraction attempt
            if source_type == "youtube":
                source_name = f"YouTube Video ({metadata.get('video_id', 'Unknown')})"
            else:
                source_name = source_url.split("://")[-1].split("/")[0]

        elif source_type == "pdf":
            if not file:
                raise ValueError("file is required for type pdf")
                
            source_name = file.filename
            pdf_path = os.path.join(settings.UPLOAD_DIR, file.filename)
            with open(pdf_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            extracted_text, metadata = process_input("pdf", pdf_path)
            processing_metadata.update(metadata)
            
            # Optionally remove the file after extraction to save space, or keep it
            # os.remove(pdf_path)
            
        else:
            return {"error": "Invalid source_type"}

    except Exception as e:
        return {"error": f"Content extraction failed: {str(e)}"}

    if not extracted_text.strip():
        return {"error": "No text could be extracted from the source."}

    # 3. Summarize Content
    try:
        summary_result = summarize_content(extracted_text)
        
        # Add basic tokens/word counts to metadata
        word_count = len(extracted_text.split())
        processing_metadata["estimated_tokens"] = int(word_count * 1.3)
        processing_metadata["source_length_chars"] = len(extracted_text)
        
    except Exception as e:
        return {"error": f"Summarization failed: {str(e)}"}

    # 4. Save to Database
    summary_id = get_next_id("summaries")
    
    doc = SummaryDoc(
        id=summary_id,
        user_id=None, # if we had auth here we'd extract it
        source_type=source_type,
        source_name=source_name,
        source_url=source_url,
        overview=summary_result.get("overview", ""),
        detailed_summary=summary_result.get("detailed_summary", ""),
        key_points=summary_result.get("key_points", []),
        important_concepts=summary_result.get("important_concepts", []),
        action_items=summary_result.get("action_items", []),
        short_summary=summary_result.get("short_summary", ""),
        processing_metadata=processing_metadata
    )

    db.summaries.insert_one(doc.model_dump())

    return {"message": "Summary generated successfully", "data": doc.model_dump()}


@router.get("/history")
async def get_summary_history(limit: int = 10, skip: int = 0):
    """Get previously generated summaries."""
    db = get_db()
    cursor = db.summaries.find().sort("created_at", -1).skip(skip).limit(limit)
    
    # Exclude _id from responses
    results = []
    for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
        
    return {"message": "Success", "data": results}


@router.get("/{summary_id}")
async def get_summary(summary_id: int):
    db = get_db()
    doc = db.summaries.find_one({"id": summary_id})
    if not doc:
        return {"error": "Summary not found"}
    
    doc.pop("_id", None)
    return {"message": "Success", "data": doc}
