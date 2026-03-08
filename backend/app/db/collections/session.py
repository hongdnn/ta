from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "sessions"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["course_id", "user_id", "started_at", "session_status", "created_at", "updated_at"],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": "objectId"},
            "started_at": {"bsonType": "date"},
            "ended_at": {"bsonType": ["date", "null"]},
            "session_status": {"enum": ["active", "ended"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index([("course_id", ASCENDING), ("started_at", DESCENDING)], name="sessions_course_started_idx")
    collection.create_index([("user_id", ASCENDING), ("started_at", DESCENDING)], name="sessions_user_started_idx")
    collection.create_index(
        [("session_status", ASCENDING), ("started_at", DESCENDING)],
        name="sessions_status_started_idx",
    )

