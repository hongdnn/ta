from __future__ import annotations

from pymongo import ASCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "professor_courses"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["course_id", "professor_id", "teaching_status", "created_at", "updated_at"],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "professor_id": {"bsonType": "objectId"},
            "teaching_status": {"enum": ["active", "ended"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("course_id", ASCENDING), ("professor_id", ASCENDING)],
        name="professor_courses_course_professor_uniq",
        unique=True,
    )
    collection.create_index(
        [("professor_id", ASCENDING), ("teaching_status", ASCENDING)],
        name="professor_courses_professor_status_idx",
    )
    collection.create_index(
        [("course_id", ASCENDING), ("teaching_status", ASCENDING)],
        name="professor_courses_course_status_idx",
    )

