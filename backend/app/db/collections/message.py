from __future__ import annotations

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection


COLLECTION_NAME = "messages"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["session_id", "course_id", "creator", "content", "activity_type", "created_at", "updated_at"],
        "properties": {
            "session_id": {"bsonType": "objectId"},
            "course_id": {"bsonType": "objectId"},
            "creator": {"enum": ["user", "agent"]},
            "user_id": {"bsonType": ["objectId", "null"]},
            "content": {"bsonType": "string"},
            "content_normalized": {"bsonType": "string"},
            "activity_type": {"enum": ["lecture", "assignment"]},
            "answer_to_message_id": {"bsonType": ["objectId", "null"]},
            "cluster_id": {"bsonType": ["objectId", "null"]},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}


def apply_indexes(collection: Collection) -> None:
    collection.create_index([("course_id", ASCENDING), ("created_at", DESCENDING)], name="messages_course_created_idx")
    collection.create_index([("session_id", ASCENDING), ("created_at", DESCENDING)], name="messages_session_created_idx")
    collection.create_index([("creator", ASCENDING), ("created_at", DESCENDING)], name="messages_creator_created_idx")
    collection.create_index([("answer_to_message_id", ASCENDING)], name="messages_answer_to_idx")
    collection.create_index([("cluster_id", ASCENDING), ("created_at", DESCENDING)], name="messages_cluster_created_idx")
    collection.create_index(
        [("course_id", ASCENDING), ("creator", ASCENDING), ("content_normalized", ASCENDING)],
        name="messages_course_creator_content_norm_idx",
    )
    collection.create_index(
        [("course_id", ASCENDING), ("creator", ASCENDING), ("created_at", DESCENDING), ("cluster_id", ASCENDING)],
        name="messages_course_creator_created_cluster_idx",
    )
    collection.create_index(
        [("course_id", ASCENDING), ("created_at", DESCENDING)],
        name="messages_user_course_created_idx",
        partialFilterExpression={"creator": "user"},
    )
