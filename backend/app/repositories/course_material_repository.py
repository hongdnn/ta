from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from pymongo import DESCENDING
from pymongo.database import Database


class CourseMaterialRepository:
    def __init__(self, db: Database):
        self.course_materials = db["course_materials"]

    def create_material(
        self,
        *,
        material_id: ObjectId,
        course_id: ObjectId,
        user_id: ObjectId,
        file_name: str,
        mime_type: str,
        file_size: int,
        storage_key: str,
        status: str,
        created_at: datetime,
        updated_at: datetime,
    ) -> dict[str, Any]:
        payload = {
            "_id": material_id,
            "course_id": course_id,
            "user_id": user_id,
            "file_name": file_name,
            "mime_type": mime_type,
            "file_size": file_size,
            "storage_key": storage_key,
            "status": status,
            "created_at": created_at,
            "updated_at": updated_at,
        }
        self.course_materials.insert_one(payload)
        return payload

    def get_by_id(self, material_id: str) -> dict[str, Any] | None:
        if not ObjectId.is_valid(material_id):
            return None
        return self.course_materials.find_one({"_id": ObjectId(material_id)})

    def list_by_course(self, *, course_id: ObjectId) -> list[dict[str, Any]]:
        cursor = self.course_materials.find({"course_id": course_id}).sort("created_at", DESCENDING)
        return list(cursor)

    def update_status(self, *, material_id: ObjectId, status: str, updated_at: datetime) -> None:
        self.course_materials.update_one(
            {"_id": material_id},
            {"$set": {"status": status, "updated_at": updated_at}},
        )
