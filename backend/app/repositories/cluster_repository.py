from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from pymongo.database import Database


class ClusterRepository:
    def __init__(self, db: Database):
        self.clusters = db["clusters"]

    def create_cluster(
        self,
        *,
        course_id: ObjectId,
        representative_message_id: ObjectId,
        created_at: datetime,
        updated_at: datetime,
    ) -> ObjectId:
        result = self.clusters.insert_one(
            {
                "course_id": course_id,
                "representative_message_id": representative_message_id,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        return result.inserted_id
