"""
AutoML-X — Authentication Routes (MongoDB Version)
Basic auth with bcrypt password hashing.
"""
import bcrypt
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from backend.database import get_db, get_next_id

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(req: RegisterRequest, db=Depends(get_db)):
    """Register a new user."""
    if not req.name.strip() or not req.email.strip() or not req.password.strip():
        raise HTTPException(400, "All fields are required")

    existing = db.users.find_one({"email": req.email.strip().lower()})
    if existing:
        raise HTTPException(409, "Email already registered")

    hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt())
    user_id = get_next_id("users")

    user_doc = {
        "id": user_id,
        "name": req.name.strip(),
        "email": req.email.strip().lower(),
        "password_hash": hashed.decode("utf-8"),
        "created_at": datetime.utcnow(),
    }
    db.users.insert_one(user_doc)

    return {
        "id": user_id,
        "name": user_doc["name"],
        "email": user_doc["email"],
        "created_at": str(user_doc["created_at"]),
    }


@router.post("/login")
def login(req: LoginRequest, db=Depends(get_db)):
    """Login with email and password."""
    user = db.users.find_one({"email": req.email.strip().lower()})
    if not user:
        raise HTTPException(401, "Invalid email or password")

    if not bcrypt.checkpw(req.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(401, "Invalid email or password")

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "created_at": str(user.get("created_at", "")),
    }


@router.get("/profile/{user_id}")
def get_profile(user_id: int, db=Depends(get_db)):
    """Get user profile with activity history."""
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")

    activities = list(
        db.user_activities.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(50)
    )

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "created_at": str(user.get("created_at", "")),
        "activities": [
            {
                "id": a["id"],
                "action": a["action"],
                "description": a["description"],
                "created_at": str(a.get("created_at", "")),
            }
            for a in activities
        ],
    }


@router.post("/activity")
def log_activity(user_id: int, action: str, description: str, db=Depends(get_db)):
    """Log a user activity."""
    activity_doc = {
        "id": get_next_id("user_activities"),
        "user_id": user_id,
        "action": action,
        "description": description,
        "created_at": datetime.utcnow(),
    }
    db.user_activities.insert_one(activity_doc)
    return {"status": "ok"}


from typing import Optional


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


@router.put("/profile/{user_id}")
def update_profile(user_id: int, req: UpdateProfileRequest, db=Depends(get_db)):
    """Update user name and/or email."""
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")

    updates = {}
    if req.name and req.name.strip():
        updates["name"] = req.name.strip()
    if req.email and req.email.strip():
        # Check email uniqueness
        email_clean = req.email.strip().lower()
        existing = db.users.find_one({"email": email_clean, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(409, "Email already in use")
        updates["email"] = email_clean

    if not updates:
        raise HTTPException(400, "Nothing to update")

    updates["updated_at"] = datetime.utcnow()
    db.users.update_one({"id": user_id}, {"$set": updates})

    updated = db.users.find_one({"id": user_id})
    return {
        "id": updated["id"],
        "name": updated["name"],
        "email": updated["email"],
        "created_at": str(updated.get("created_at", "")),
    }


@router.get("/stats/{user_id}")
def get_user_stats(user_id: int, db=Depends(get_db)):
    """Get dynamic usage stats for a user based on their actual projects."""
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")

    all_projects = list(db.projects.find())
    completed = [p for p in all_projects if p.get("status") == "completed"]
    total_rows = sum(p.get("num_rows", 0) or 0 for p in all_projects)
    total_features = sum(p.get("num_features", 0) or 0 for p in all_projects)

    # Count generated projects too
    gen_projects = db.generated_projects.count_documents({}) if "generated_projects" in db.list_collection_names() else 0

    return {
        "total_projects": len(all_projects),
        "completed_models": len(completed),
        "total_rows_processed": total_rows,
        "total_features": total_features,
        "generated_projects": gen_projects,
        "tier": "Pro" if len(completed) >= 5 else "Starter" if len(completed) >= 1 else "Free",
    }
