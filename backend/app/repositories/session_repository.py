from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database
from pymongo import ReturnDocument


class SessionRepository:
    def __init__(self, db: Database):
        self.sessions = db["sessions"]

    def create_session(self, *, course_id: str, user_id: str) -> dict:
        if not ObjectId.is_valid(course_id):
            raise ValueError("Invalid course_id")
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user_id")
        now = datetime.now(timezone.utc)
        payload = {
            "course_id": ObjectId(course_id),
            "user_id": ObjectId(user_id),
            "started_at": now,
            "ended_at": None,
            "session_status": "active",
            "created_at": now,
            "updated_at": now,
        }
        result = self.sessions.insert_one(payload)
        created = self.sessions.find_one({"_id": result.inserted_id})
        if not created:
            raise RuntimeError("Failed to create session")
        return created

    def get_session_by_id(self, session_id: str) -> dict | None:
        if not ObjectId.is_valid(session_id):
            return None
        return self.sessions.find_one({"_id": ObjectId(session_id)})

    def end_session(self, *, session_id: str, user_id: str) -> dict | None:
        if not ObjectId.is_valid(session_id):
            raise ValueError("Invalid session_id")
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user_id")
        now = datetime.now(timezone.utc)
        return self.sessions.find_one_and_update(
            {
                "_id": ObjectId(session_id),
                "user_id": ObjectId(user_id),
                "session_status": "active",
            },
            {
                "$set": {
                    "session_status": "ended",
                    "ended_at": now,
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
