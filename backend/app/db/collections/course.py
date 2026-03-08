from __future__ import annotations

from pymongo import ASCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "courses"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["institution_id", "code", "title", "status", "created_at", "updated_at"],
        "properties": {
            "institution_id": {"bsonType": "objectId"},
            "code": {"bsonType": "string"},
            "title": {"bsonType": "string"},
            "status": {"enum": ["active", "archived"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("institution_id", ASCENDING), ("code", ASCENDING)],
        name="courses_institution_code_uniq",
        unique=True,
    )
    collection.create_index([("institution_id", ASCENDING), ("status", ASCENDING)], name="courses_institution_status_idx")

