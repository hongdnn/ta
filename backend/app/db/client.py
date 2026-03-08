from __future__ import annotations

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import settings

_mongo_client: MongoClient | None = None


def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        if not settings.mongo_url:
            raise RuntimeError("MONGODB_URL is required")
        _mongo_client = MongoClient(settings.mongo_url)
    return _mongo_client


def get_db() -> Database:
    client = get_mongo_client()
    return client[settings.mongo_db_name]

