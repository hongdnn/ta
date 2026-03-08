from __future__ import annotations

from pymongo import ASCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "student_courses"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["course_id", "student_id", "enrollment_status", "created_at", "updated_at"],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "student_id": {"bsonType": "objectId"},
            "enrollment_status": {"enum": ["enrolled", "dropped", "completed"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("course_id", ASCENDING), ("student_id", ASCENDING)],
        name="student_courses_course_student_uniq",
        unique=True,
    )
    collection.create_index(
        [("student_id", ASCENDING), ("enrollment_status", ASCENDING)],
        name="student_courses_student_status_idx",
    )
    collection.create_index(
        [("course_id", ASCENDING), ("enrollment_status", ASCENDING)],
        name="student_courses_course_status_idx",
    )

