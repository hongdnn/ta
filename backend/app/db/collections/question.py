from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "questions"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["session_id", "course_id", "user_id", "text", "created_at", "updated_at"],
        "properties": {
            "session_id": {"bsonType": "objectId"},
            "course_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": "objectId"},
            "text": {"bsonType": "string"},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index([("course_id", ASCENDING), ("created_at", DESCENDING)], name="questions_course_created_idx")
    collection.create_index([("session_id", ASCENDING), ("created_at", DESCENDING)], name="questions_session_created_idx")
    collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="questions_user_created_idx")

