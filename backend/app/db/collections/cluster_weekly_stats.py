from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "cluster_weekly_stats"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "course_id",
            "cluster_id",
            "week_start",
            "asks_this_week",
            "asks_before_week",
            "asks_total_until_now",
            "created_at",
            "updated_at",
        ],
        "properties": {
            "course_id": {"bsonType": "objectId"},
            "cluster_id": {"bsonType": "objectId"},
            "week_start": {"bsonType": "date"},
            "asks_this_week": {"bsonType": "int", "minimum": 0},
            "asks_before_week": {"bsonType": "int", "minimum": 0},
            "asks_total_until_now": {"bsonType": "int", "minimum": 0},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index(
        [("course_id", ASCENDING), ("cluster_id", ASCENDING), ("week_start", ASCENDING)],
        name="cluster_weekly_stats_course_cluster_week_uniq",
        unique=True,
    )
    collection.create_index(
        [("course_id", ASCENDING), ("week_start", DESCENDING), ("asks_this_week", DESCENDING)],
        name="cluster_weekly_stats_course_week_count_idx",
    )
