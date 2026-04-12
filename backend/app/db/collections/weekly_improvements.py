from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "weekly_improvements"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "course_id",
            "week_start",
            "question_fingerprint",
            "improvements",
            "created_at",
            "updated_at",
        ],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "week_start": {"bsonType": "date"},
            "question_fingerprint": {
                "bsonType": "array",
                "items": {"bsonType": "string"},
            },
            "improvements": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": [
                        "cluster_id",
                        "question",
                        "asks_this_week",
                        "asks_before_week",
                        "asks_total_until_now",
                        "problem",
                        "title",
                        "solution",
                        "review_materials",
                    ],
                    "properties": {
                        "cluster_id": {"bsonType": "string"},
                        "question": {"bsonType": "string"},
                        "asks_this_week": {"bsonType": "int", "minimum": 0},
                        "asks_before_week": {"bsonType": "int", "minimum": 0},
                        "asks_total_until_now": {"bsonType": "int", "minimum": 0},
                        "problem": {"bsonType": "string"},
                        "title": {"bsonType": "string"},
                        "solution": {"bsonType": "string"},
                        "review_materials": {
                            "bsonType": "array",
                            "items": {
                                "bsonType": "object",
                                "required": ["material_id", "file_name", "page", "score"],
                                "properties": {
                                    "material_id": {"bsonType": "string"},
                                    "file_name": {"bsonType": "string"},
                                    "page": {"bsonType": "int", "minimum": 0},
                                    "score": {"bsonType": ["double", "int"]},
                                },
                            },
                        },
                    },
                },
            },
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("course_id", ASCENDING), ("week_start", ASCENDING)],
        name="weekly_improvements_course_week_uniq",
        unique=True,
    )
    collection.create_index(
        [("course_id", ASCENDING), ("updated_at", DESCENDING)],
        name="weekly_improvements_course_updated_idx",
    )
