from fastapi import APIRouter, Form, UploadFile, File, Depends, HTTPException
from typing import Optional, List
import os
import shutil
from datetime import datetime
from pydantic import BaseModel

from backend.config import settings
from backend.database import get_db, get_next_id
from backend.services.research_service import generate_search_queries, execute_tavily_search, compile_research_report
from backend.services.content_loader import process_input
from backend.pdf_engine.embedder import chunk_text, build_tfidf_index, retrieve_relevant_chunks
from backend.services.llm_service import chat_with_copilot

router = APIRouter(prefix="/api/research", tags=["Research Agent"])

# In-memory store for research embeddings
_research_embedding_cache: dict = {}

class ChatRequest(BaseModel):
    message: str

@router.post("/start")
async def start_research(
    topic: str = Form(...),
    url: Optional[str] = Form(None),
    youtube_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db=Depends(get_db)
):
    """Starts the research pipeline."""
    project_id = get_next_id("research_projects")
    
    # Init project
    project = {
        "id": project_id,
        "title": topic,
        "topic": topic,
        "status": "planning",
        "sources_count": 0,
        "search_queries": [],
        "created_at": datetime.utcnow()
    }
    db.research_projects.insert_one(project)
    
    # 1. Planning (Generate queries)
    queries = await generate_search_queries(topic)
    db.research_projects.update_one({"id": project_id}, {"$set": {"status": "searching", "search_queries": queries}})
    
    # 2. Searching
    tavily_results = await execute_tavily_search(queries)
    sources_to_extract = [{"type": "web", "url": res["url"], "name": res["title"]} for res in tavily_results]
    
    # Add manual sources
    if url:
        sources_to_extract.append({"type": "web", "url": url, "name": url})
    if youtube_url:
        sources_to_extract.append({"type": "youtube", "url": youtube_url, "name": "YouTube Video"})
        
    file_path = None
    if file:
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as bf:
            shutil.copyfileobj(file.file, bf)
        sources_to_extract.append({"type": "pdf", "url": file_path, "name": file.filename})

    db.research_projects.update_one({"id": project_id}, {"$set": {"status": "extracting", "sources_count": len(sources_to_extract)}})

    # 3. Extract contents
    aggregated_text = ""
    kwargs = {"gemini_api_key": settings.GEMINI_API_KEY}
    
    for src in sources_to_extract:
        try:
            text, metadata = process_input(src["type"], src["url"], kwargs)
            if text:
                aggregated_text += f"\n\n--- Source: {src['name']} ---\n{text}"
                source_doc = {
                    "id": get_next_id("research_sources"),
                    "project_id": project_id,
                    "source_type": src["type"],
                    "source_url": src["url"].replace(settings.UPLOAD_DIR + os.sep, "") if src["type"] == "pdf" else src["url"],
                    "source_name": src["name"],
                    "extracted_text": text,
                    "created_at": datetime.utcnow()
                }
                db.research_sources.insert_one(source_doc)
        except Exception as e:
            pass # continue even if one fails
            
    if not aggregated_text.strip():
        db.research_projects.update_one({"id": project_id}, {"$set": {"status": "failed", "final_report": "No content could be extracted from any source."}})
        return {"id": project_id, "status": "failed"}

    # Set up Vector DB index for chat
    chunks = chunk_text(aggregated_text)
    tfidf_index = build_tfidf_index(chunks)
    _research_embedding_cache[project_id] = {
        "chunks": chunks,
        "index": tfidf_index,
        "full_text": aggregated_text
    }

    # 4. Summarize and Report
    db.research_projects.update_one({"id": project_id}, {"$set": {"status": "summarizing"}})
    report_data = await compile_research_report(topic, aggregated_text)
    
    # Save results
    db.research_projects.update_one(
        {"id": project_id},
        {"$set": {
            "status": "completed",
            "final_report": report_data.get("final_report", ""),
            "short_summary": report_data.get("short_summary", ""),
            "key_points": report_data.get("key_points", []),
            "notes": report_data.get("notes", ""),
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"id": project_id, "status": "completed", "message": "Research pipeline finished"}


@router.get("/history")
def get_research_history(limit: int = 10, skip: int = 0, db=Depends(get_db)):
    """Get all past research projects."""
    projects = list(db.research_projects.find().sort("created_at", -1).skip(skip).limit(limit))
    return [{"id": p["id"], "title": p["title"], "date": str(p["created_at"]), "sources_count": p.get("sources_count", 0), "status": p["status"], "short_summary": p.get("short_summary", "")} for p in projects]


@router.get("/{project_id}")
def get_research_project(project_id: int, db=Depends(get_db)):
    """Get specific project details and its sources."""
    project = db.research_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")
        
    sources = list(db.research_sources.find({"project_id": project_id}, {"extracted_text": 0})) # omit massive text
    
    return {
        "project": {k: v for k, v in project.items() if k != "_id"},
        "sources": [{k: v for k, v in s.items() if k != "_id"} for s in sources]
    }


@router.post("/{project_id}/chat")
async def chat_with_research(project_id: int, request: ChatRequest, db=Depends(get_db)):
    """RAG Chat against the research gathered."""
    project = db.research_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    # Load into cache if not present (server restart)
    if project_id not in _research_embedding_cache:
        sources = list(db.research_sources.find({"project_id": project_id}))
        aggregated_text = "\n\n".join([f"--- Source: {s.get('source_name')} ---\n{s.get('extracted_text','')}" for s in sources])
        chunks = chunk_text(aggregated_text)
        tfidf_index = build_tfidf_index(chunks)
        _research_embedding_cache[project_id] = {
            "chunks": chunks,
            "index": tfidf_index,
            "full_text": aggregated_text
        }
        
    cache = _research_embedding_cache[project_id]
    chunks = cache["chunks"]
    tfidf_index = cache["index"]

    # retrieve chunks
    relevant = retrieve_relevant_chunks(request.message, chunks, tfidf_index, top_k=3)
    context_text = "\n\n".join([c["text"] for c in relevant])

    history = list(
        db.chat_messages.find(
            {"project_id": project_id, "source_type": "research"}
        ).sort("created_at", 1)
    )
    chat_history = [{"role": msg["role"], "content": msg["content"]} for msg in history[-10:]]

    user_msg = {
        "id": get_next_id("chat_messages"),
        "project_id": project_id,
        "document_id": None,
        "source_type": "research",
        "role": "user",
        "content": request.message,
        "created_at": datetime.utcnow()
    }
    db.chat_messages.insert_one(user_msg)

    rag_prompt = (
        f"You are navigating a research project on '{project['topic']}'.\n"
        f"Answer the user's question accurately using ONLY the information from the gathered research context below. "
        f"If the answer is not found in the context, say so clearly.\n\n"
        f"RESEARCH CONTEXT:\n{context_text}\n\n"
        f"USER QUESTION: {request.message}"
    )

    response = await chat_with_copilot(rag_prompt, {"profile": {"shape": {"rows": 0, "columns": 0}}}, chat_history)

    assistant_msg = {
        "id": get_next_id("chat_messages"),
        "project_id": project_id,
        "document_id": None,
        "source_type": "research",
        "role": "assistant",
        "content": response,
        "created_at": datetime.utcnow()
    }
    db.chat_messages.insert_one(assistant_msg)

    return {"response": response}
