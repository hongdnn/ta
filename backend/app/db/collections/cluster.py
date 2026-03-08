from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "clusters"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["course_id", "representative_question_id", "count", "created_at", "updated_at"],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "representative_question_id": {"bsonType": "objectId"},
            "count": {"bsonType": "int", "minimum": 0},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index([("course_id", ASCENDING), ("count", DESCENDING)], name="clusters_course_count_idx")
    collection.create_index([("course_id", ASCENDING), ("updated_at", DESCENDING)], name="clusters_course_updated_idx")
    collection.create_index([("representative_question_id", ASCENDING)], name="clusters_representative_question_idx")

