from __future__ import annotations

from bson import ObjectId
from pymongo.database import Database
from pymongo import ASCENDING


class CourseRepository:
    def __init__(self, db: Database):
        self.courses = db["courses"]

    def list_active_by_institution(self, institution_id: str) -> list[dict]:
        if not ObjectId.is_valid(institution_id):
            return []
        pipeline = [
            {"$match": {"institution_id": ObjectId(institution_id), "status": "active"}},
            {
                "$lookup": {
                    "from": "institutions",
                    "localField": "institution_id",
                    "foreignField": "_id",
                    "as": "institution",
                }
            },
            {"$unwind": {"path": "$institution", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "title": 1,
                    "code": 1,
                    "institution_id": 1,
                    "institution_timezone": "$institution.timezone",
                }
            },
            {"$sort": {"code": ASCENDING}},
        ]
        return list(self.courses.aggregate(pipeline))

    def list_active_by_institutions(self, institution_ids: list[str]) -> list[dict]:
        object_ids = [ObjectId(i) for i in institution_ids if ObjectId.is_valid(i)]
        if not object_ids:
            return []
        pipeline = [
            {"$match": {"institution_id": {"$in": object_ids}, "status": "active"}},
            {
                "$lookup": {
                    "from": "institutions",
                    "localField": "institution_id",
                    "foreignField": "_id",
                    "as": "institution",
                }
            },
            {"$unwind": {"path": "$institution", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "title": 1,
                    "code": 1,
                    "institution_id": 1,
                    "institution_timezone": "$institution.timezone",
                }
            },
            {"$sort": {"institution_id": ASCENDING, "code": ASCENDING}},
        ]
        return list(self.courses.aggregate(pipeline))

    def get_by_id(self, course_id: str) -> dict | None:
        if not ObjectId.is_valid(course_id):
            return None
        return self.courses.find_one({"_id": ObjectId(course_id)})
