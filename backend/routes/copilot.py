"""
AutoML-X — AI Copilot Chat Route (MongoDB Version)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.database import get_db, get_next_id
from backend.services.llm_service import chat_with_copilot

router = APIRouter(prefix="/api/projects", tags=["Copilot"])


class ChatRequest(BaseModel):
    message: str


@router.post("/{project_id}/chat")
async def chat(
    project_id: int,
    request: ChatRequest,
    db=Depends(get_db),
):
    """Send a message to the AI Copilot."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    # Build context from project data
    context = {}
    if project.get("profile_data"):
        context["profile"] = project["profile_data"]
    if project.get("results_data"):
        results = project["results_data"]
        context["results"] = results
        context["feature_importance"] = results.get("feature_importance", {})

    # Get chat history
    history = list(
        db.chat_messages.find(
            {"project_id": project_id, "source_type": "project"}
        ).sort("created_at", 1)
    )
    chat_history = [{"role": msg["role"], "content": msg["content"]} for msg in history]

    # Save user message
    user_msg_doc = {
        "id": get_next_id("chat_messages"),
        "project_id": project_id,
        "document_id": None,
        "source_type": "project",
        "role": "user",
        "content": request.message,
        "created_at": datetime.utcnow(),
    }
    db.chat_messages.insert_one(user_msg_doc)

    # Get LLM response
    response = await chat_with_copilot(request.message, context, chat_history)

    # Save assistant message
    assistant_msg_doc = {
        "id": get_next_id("chat_messages"),
        "project_id": project_id,
        "document_id": None,
        "source_type": "project",
        "role": "assistant",
        "content": response,
        "created_at": datetime.utcnow(),
    }
    db.chat_messages.insert_one(assistant_msg_doc)

    return {"response": response}


@router.get("/{project_id}/chat/history")
def get_chat_history(project_id: int, db=Depends(get_db)):
    """Get chat history for a project."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    messages = list(
        db.chat_messages.find(
            {"project_id": project_id, "source_type": "project"}
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
