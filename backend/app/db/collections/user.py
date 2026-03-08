from __future__ import annotations

from pymongo import ASCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "users"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["email", "name", "user_type", "password", "status", "created_at", "updated_at"],
        "properties": {
            "email": {"bsonType": "string"},
            "name": {"bsonType": "string"},
            "user_type": {"enum": ["student", "professor", "admin"]},
            "password": {"bsonType": "string"},
            "status": {"enum": ["active", "suspended"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index([("email", ASCENDING)], name="users_email_uniq", unique=True)
    collection.create_index([("user_type", ASCENDING), ("status", ASCENDING)], name="users_type_status_idx")
