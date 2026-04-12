from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "course_materials"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "course_id",
            "user_id",
            "file_name",
            "mime_type",
            "file_size",
            "storage_key",
            "status",
            "created_at",
            "updated_at",
        ],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": "objectId"},
            "file_name": {"bsonType": "string"},
            "mime_type": {"bsonType": "string"},
            "file_size": {"bsonType": ["int", "long"], "minimum": 0},
            "storage_key": {"bsonType": "string"},
            "status": {"enum": ["processing", "ready", "failed"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("course_id", ASCENDING), ("created_at", DESCENDING)],
        name="course_materials_course_created_idx",
    )
    collection.create_index(
        [("course_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)],
        name="course_materials_course_status_updated_idx",
    )
    collection.create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
        name="course_materials_user_created_idx",
    )
