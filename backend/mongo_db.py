"""
AutoML-X — MongoDB Connection Module
Provides database connection, dependency injection, and index creation.
"""
from pymongo import MongoClient, ASCENDING, DESCENDING
from backend.config import settings

# MongoDB client (connection pooling handled automatically by pymongo)
_client = MongoClient(settings.MONGODB_URI)
_database = _client[settings.MONGODB_DB_NAME]

# Counter collection for auto-increment IDs (URL-friendly integer IDs)
_COUNTER_COLLECTION = "counters"


def get_db():
    """Dependency: returns the MongoDB database instance."""
    return _database


def get_next_id(collection_name: str) -> int:
    """Get the next auto-increment integer ID for a collection."""
    result = _database[_COUNTER_COLLECTION].find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]


def init_db():
    """Create indexes on collections for performance."""
    db = _database

    # Users indexes
    db.users.create_index([("email", ASCENDING)], unique=True)

    # Projects indexes
    db.projects.create_index([("created_at", DESCENDING)])
    db.projects.create_index([("status", ASCENDING)])

    # Documents indexes
    db.documents.create_index([("created_at", DESCENDING)])

    # Chat messages indexes
    db.chat_messages.create_index([("project_id", ASCENDING), ("created_at", ASCENDING)])
    db.chat_messages.create_index([("document_id", ASCENDING), ("created_at", ASCENDING)])

    # User activities indexes
    db.user_activities.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    # Model versions indexes
    db.model_versions.create_index([("project_id", ASCENDING)])

    # PDF Video indexes
    db.pdf_videos.create_index([("created_at", DESCENDING)])

    # Summaries indexes
    db.summaries.create_index([("created_at", DESCENDING)])

    print("[OK] MongoDB indexes created successfully")
