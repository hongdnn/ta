from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from pymongo.database import Database


class MessageRepository:
    def __init__(self, db: Database):
        self.messages = db["messages"]

    def create_message(
        self,
        *,
        session_id: ObjectId,
        course_id: ObjectId,
        creator: str,
        content: str,
        content_normalized: str,
        user_id: ObjectId | None = None,
        answer_to_message_id: ObjectId | None = None,
        cluster_id: ObjectId | None = None,
        created_at: datetime,
        updated_at: datetime,
    ) -> ObjectId:
        payload: dict[str, Any] = {
            "session_id": session_id,
            "course_id": course_id,
            "creator": creator,
            "user_id": user_id,
            "content": content,
            "content_normalized": content_normalized,
            "answer_to_message_id": answer_to_message_id,
            "cluster_id": cluster_id,
            "created_at": created_at,
            "updated_at": updated_at,
        }
        result = self.messages.insert_one(payload)
        return result.inserted_id

    def set_cluster(self, message_id: ObjectId, cluster_id: ObjectId, updated_at: datetime) -> None:
        self.messages.update_one(
            {"_id": message_id},
            {"$set": {"cluster_id": cluster_id, "updated_at": updated_at}},
        )

    def find_recent_user_message_cluster_by_normalized_content(
        self,
        *,
        course_id: ObjectId,
        content_normalized: str,
    ) -> ObjectId | None:
        doc = self.messages.find_one(
            {
                "course_id": course_id,
                "creator": "user",
                "content_normalized": content_normalized,
                "cluster_id": {"$type": "objectId"},
            },
            {"cluster_id": 1},
            sort=[("created_at", -1)],
        )
        if not doc:
            return None
        cluster_id = doc.get("cluster_id")
        return cluster_id if isinstance(cluster_id, ObjectId) else None

    def count_user_messages_for_cluster_before(
        self,
        *,
        course_id: ObjectId,
        cluster_id: ObjectId,
        before_date: datetime,
    ) -> int:
        return self.messages.count_documents(
            {
                "course_id": course_id,
                "creator": "user",
                "cluster_id": cluster_id,
                "created_at": {"$lt": before_date},
            }
        )

    def find_by_ids(self, ids: list[ObjectId]) -> list[dict]:
        if not ids:
            return []
        return list(self.messages.find({"_id": {"$in": ids}}))

    def aggregate_user_cluster_counts_in_range(
        self,
        *,
        course_id: ObjectId,
        start_date: datetime,
        end_date: datetime,
        limit: int | None = None,
    ) -> list[dict]:
        pipeline = [
            {
                "$match": {
                    "course_id": course_id,
                    "creator": "user",
                    "cluster_id": {"$type": "objectId"},
                    "created_at": {"$gte": start_date, "$lt": end_date},
                }
            },
            {"$group": {"_id": "$cluster_id", "asks_this_week": {"$sum": 1}}},
            {"$sort": {"asks_this_week": -1}},
        ]
        if limit is not None:
            pipeline.append({"$limit": limit})
        return list(self.messages.aggregate(pipeline))

    def aggregate_user_cluster_counts_before(
        self,
        *,
        course_id: ObjectId,
        cluster_ids: list[ObjectId],
        before_date: datetime,
    ) -> dict[str, int]:
        if not cluster_ids:
            return {}
        pipeline = [
            {
                "$match": {
                    "course_id": course_id,
                    "creator": "user",
                    "cluster_id": {"$in": cluster_ids},
                    "created_at": {"$lt": before_date},
                }
            },
            {"$group": {"_id": "$cluster_id", "asks_before_week": {"$sum": 1}}},
        ]
        rows = list(self.messages.aggregate(pipeline))
        return {str(row["_id"]): int(row.get("asks_before_week", 0)) for row in rows if isinstance(row.get("_id"), ObjectId)}
