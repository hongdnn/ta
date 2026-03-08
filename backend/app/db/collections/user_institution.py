from __future__ import annotations

from pymongo import ASCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "user_institutions"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["user_id", "institution_id", "role", "status", "created_at", "updated_at"],
        "properties": {
            "user_id": {"bsonType": "objectId"},
            "institution_id": {"bsonType": "objectId"},
            "role": {"enum": ["student", "professor"]},
            "status": {"enum": ["active", "inactive"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("user_id", ASCENDING), ("institution_id", ASCENDING), ("role", ASCENDING)],
        name="user_institutions_user_institution_role_uniq",
        unique=True,
    )
    collection.create_index(
        [("institution_id", ASCENDING), ("role", ASCENDING), ("status", ASCENDING)],
        name="user_institutions_institution_role_status_idx",
    )

