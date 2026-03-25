"""
SOMA.AI Database Setup — MongoDB
Backward-compatible wrapper that delegates to mongo_db module.
"""
from backend.mongo_db import get_db, init_db, get_next_id

__all__ = ["get_db", "init_db", "get_next_id"]
