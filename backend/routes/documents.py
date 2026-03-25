"""
AutoML-X — Document Routes (PDF Upload & Analysis)
Handles PDF upload, analysis, chart generation, AI summary, and chat.
"""
import os
import shutil
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel

from backend.database import get_db, get_next_id
from backend.config import settings
from backend.pdf_engine.extractor import extract_pdf, extract_numeric_data
from backend.pdf_engine.analyzer import generate_charts, detect_key_metrics
from backend.pdf_engine.embedder import chunk_text, build_tfidf_index, retrieve_relevant_chunks
from backend.services.llm_service import chat_with_copilot

router = APIRouter(prefix="/api/documents", tags=["Documents"])

# In-memory store for embeddings (per document_id)
_embedding_cache: dict = {}


class DocChatRequest(BaseModel):
    message: str


# =========================================================
# UPLOAD PDF DOCUMENT
# =========================================================
@router.post("")
async def upload_document(
    name: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_db),
):
    """Upload a PDF document and trigger extraction pipeline."""
    if not name.strip():
        raise HTTPException(400, "Document name is required")

    if not file.filename:
        raise HTTPException(400, "No file uploaded")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    doc_id = get_next_id("documents")

    doc_dir = os.path.join(settings.UPLOAD_DIR, f"doc_{doc_id}")
    os.makedirs(doc_dir, exist_ok=True)
    file_path = os.path.join(doc_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(400, f"Error saving file: {str(e)}")

    # Create document record
    doc = {
        "id": doc_id,
        "name": name.strip(),
        "filename": file.filename,
        "status": "processing",
        "page_count": None,
        "extracted_text": None,
        "tables": None,
        "charts": None,
        "key_metrics": None,
        "ai_summary": None,
        "embeddings_stored": False,
        "created_at": datetime.utcnow(),
    }
    db.documents.insert_one(doc)

    # Run extraction pipeline
    try:
        extraction = extract_pdf(file_path)

        # Extract numeric data from tables
        numeric_data = extract_numeric_data(extraction.get("tables", []))

        # Generate charts
        charts = generate_charts(numeric_data)

        # Detect key metrics from text
        key_metrics = detect_key_metrics(extraction.get("text", ""))

        # Build text embeddings for chat
        chunks = chunk_text(extraction.get("text", ""))
        tfidf_index = build_tfidf_index(chunks)
        _embedding_cache[doc_id] = {
            "chunks": chunks,
            "index": tfidf_index,
        }

        # Generate AI summary
        ai_summary = ""
        text_preview = extraction.get("text", "")[:3000]
        if text_preview.strip() and settings.OPENROUTER_API_KEY:
            try:
                summary_context = {"profile": {"shape": {"rows": 0, "columns": 0}}}
                summary_prompt = (
                    f"Summarize the following document in 4-6 clear sentences. "
                    f"Highlight the main topics, key findings, and any important numbers or statistics.\n\n"
                    f"DOCUMENT TEXT:\n{text_preview}"
                )
                ai_summary = await chat_with_copilot(summary_prompt, summary_context, [])
            except Exception:
                ai_summary = "AI summary could not be generated."

        # Update document with results
        db.documents.update_one(
            {"id": doc_id},
            {"$set": {
                "status": "completed",
                "page_count": extraction.get("page_count", 0),
                "extracted_text": extraction.get("text", ""),
                "tables": extraction.get("tables", []),
                "charts": charts,
                "key_metrics": key_metrics,
                "ai_summary": ai_summary,
                "embeddings_stored": True,
            }}
        )

        return {
            "id": doc_id,
            "name": name.strip(),
            "status": "completed",
            "page_count": extraction.get("page_count", 0),
            "table_count": len(extraction.get("tables", [])),
            "chart_count": len(charts),
        }

    except Exception as e:
        db.documents.update_one(
            {"id": doc_id},
            {"$set": {"status": "failed"}}
        )
        raise HTTPException(400, f"Error processing PDF: {str(e)}")


# =========================================================
# LIST ALL DOCUMENTS
# =========================================================
@router.get("")
def list_documents(db=Depends(get_db)):
    """List all uploaded documents."""
    docs = list(db.documents.find().sort("created_at", -1))
    return [
        {
            "id": d["id"],
            "name": d["name"],
            "filename": d.get("filename"),
            "status": d.get("status"),
            "page_count": d.get("page_count"),
            "created_at": str(d.get("created_at", "")),
        }
        for d in docs
    ]


# =========================================================
# GET DOCUMENT DETAILS
# =========================================================
@router.get("/{doc_id}")
def get_document(doc_id: int, db=Depends(get_db)):
    """Get full document details."""
    doc = db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    return {
        "id": doc["id"],
        "name": doc["name"],
        "filename": doc.get("filename"),
        "status": doc.get("status"),
        "page_count": doc.get("page_count"),
        "extracted_text": doc.get("extracted_text", ""),
        "tables": doc.get("tables", []),
        "charts": doc.get("charts", []),
        "key_metrics": doc.get("key_metrics", []),
        "ai_summary": doc.get("ai_summary", ""),
        "created_at": str(doc.get("created_at", "")),
    }


# =========================================================
# DELETE DOCUMENT
# =========================================================
@router.delete("/{doc_id}")
def delete_document(doc_id: int, db=Depends(get_db)):
    """Delete a document and clean up files."""
    doc = db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    doc_dir = os.path.join(settings.UPLOAD_DIR, f"doc_{doc_id}")
    if os.path.exists(doc_dir):
        shutil.rmtree(doc_dir)

    db.chat_messages.delete_many({"document_id": doc_id})
    db.documents.delete_one({"id": doc_id})

    # Clear embedding cache
    _embedding_cache.pop(doc_id, None)

    return {"message": "Document deleted successfully"}


# =========================================================
# CHAT WITH DOCUMENT
# =========================================================
@router.post("/{doc_id}/chat")
async def chat_with_document(
    doc_id: int,
    request: DocChatRequest,
    db=Depends(get_db),
):
    """Chat with an uploaded PDF document using RAG."""
    doc = db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    # Get or rebuild embeddings
    if doc_id not in _embedding_cache:
        text = doc.get("extracted_text", "")
        chunks = chunk_text(text)
        tfidf_index = build_tfidf_index(chunks)
        _embedding_cache[doc_id] = {"chunks": chunks, "index": tfidf_index}

    cache = _embedding_cache[doc_id]
    chunks = cache["chunks"]
    tfidf_index = cache["index"]

    # Retrieve relevant chunks
    relevant = retrieve_relevant_chunks(request.message, chunks, tfidf_index, top_k=3)
    context_text = "\n\n".join([c["text"] for c in relevant])

    # Get chat history
    history = list(
        db.chat_messages.find(
            {"document_id": doc_id, "source_type": "document"}
        ).sort("created_at", 1)
    )
    chat_history = [{"role": msg["role"], "content": msg["content"]} for msg in history[-10:]]

    # Save user message
    user_msg = {
        "id": get_next_id("chat_messages"),
        "project_id": None,
        "document_id": doc_id,
        "source_type": "document",
        "role": "user",
        "content": request.message,
        "created_at": datetime.utcnow(),
    }
    db.chat_messages.insert_one(user_msg)

    # Build RAG prompt
    context = {
        "profile": {"shape": {"rows": 0, "columns": 0}},
    }

    rag_prompt = (
        f"You are analyzing a PDF document titled '{doc['name']}'. "
        f"Answer the user's question using ONLY the information from the document context below. "
        f"If the answer is not found in the context, say so clearly.\n\n"
        f"DOCUMENT CONTEXT:\n{context_text}\n\n"
        f"USER QUESTION: {request.message}"
    )

    response = await chat_with_copilot(rag_prompt, context, chat_history)

    # Save assistant message
    assistant_msg = {
        "id": get_next_id("chat_messages"),
        "project_id": None,
        "document_id": doc_id,
        "source_type": "document",
        "role": "assistant",
        "content": response,
        "created_at": datetime.utcnow(),
    }
    db.chat_messages.insert_one(assistant_msg)

    return {"response": response}


# =========================================================
# DOCUMENT CHAT HISTORY
# =========================================================
@router.get("/{doc_id}/chat/history")
def get_document_chat_history(doc_id: int, db=Depends(get_db)):
    """Get chat history for a document."""
    doc = db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    messages = list(
        db.chat_messages.find(
            {"document_id": doc_id, "source_type": "document"}
        ).sort("created_at", 1)
    )

    return [
        {
            "id": msg["id"],
            "role": msg["role"],
            "content": msg["content"],
            "created_at": str(msg.get("created_at", "")),
        }
        for msg in messages
    ]


# =========================================================
# GET DOCUMENT CHARTS
# =========================================================
@router.get("/{doc_id}/charts")
def get_document_charts(doc_id: int, db=Depends(get_db)):
    """Get generated charts for a document."""
    doc = db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    return {"charts": doc.get("charts", [])}
