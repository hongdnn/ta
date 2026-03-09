from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "clusters"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "course_id",
            "representative_message_id",
            "created_at",
            "updated_at",
        ],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "representative_message_id": {"bsonType": "objectId"},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("representative_message_id", ASCENDING)],
        name="clusters_representative_message_idx",
    )
