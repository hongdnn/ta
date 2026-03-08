from __future__ import annotations

from bson import ObjectId
from pymongo.database import Database


class CourseRepository:
    def __init__(self, db: Database):
        self.courses = db["courses"]

    def list_active_by_institution(self, institution_id: str) -> list[dict]:
        if not ObjectId.is_valid(institution_id):
            return []
        cursor = self.courses.find(
            {"institution_id": ObjectId(institution_id), "status": "active"},
            {"title": 1, "code": 1, "institution_id": 1},
        ).sort("code", 1)
        return list(cursor)
