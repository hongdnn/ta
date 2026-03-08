from __future__ import annotations

from pymongo import ASCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "institutions"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["name", "type", "status", "created_at", "updated_at"],
        "properties": {
            "name": {"bsonType": "string"},
            "type": {"enum": ["university", "platform", "bootcamp", "training_center"]},
            "status": {"enum": ["active", "inactive"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index([("name", ASCENDING)], name="institutions_name_idx")
    collection.create_index([("type", ASCENDING), ("status", ASCENDING)], name="institutions_type_status_idx")

