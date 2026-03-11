from __future__ import annotations

from bson import ObjectId
from pymongo.database import Database


class InstitutionRepository:
    def __init__(self, db: Database):
        self.institutions = db["institutions"]

    def exists_by_id(self, institution_id: str) -> bool:
        if not ObjectId.is_valid(institution_id):
            return False
        return self.institutions.find_one({"_id": ObjectId(institution_id)}) is not None

    def list_active(self) -> list[dict]:
        cursor = self.institutions.find(
            {"status": "active"},
            {"name": 1, "type": 1, "timezone": 1},
        ).sort("name", 1)
        return list(cursor)

    def get_by_id(self, institution_id: str) -> dict | None:
        if not ObjectId.is_valid(institution_id):
            return None
        return self.institutions.find_one({"_id": ObjectId(institution_id)})
