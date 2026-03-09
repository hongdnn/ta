from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from pymongo.database import Database


class ClusterWeeklyStatsRepository:
    def __init__(self, db: Database):
        self.cluster_weekly_stats = db["cluster_weekly_stats"]

    def increment_week_asks(
        self,
        *,
        course_id: ObjectId,
        cluster_id: ObjectId,
        week_start: datetime,
        updated_at: datetime,
    ) -> None:
        self.cluster_weekly_stats.update_one(
            {
                "course_id": course_id,
                "cluster_id": cluster_id,
                "week_start": week_start,
            },
            {
                "$inc": {"asks_this_week": 1},
                "$set": {"updated_at": updated_at},
                "$setOnInsert": {
                    "asks_before_week": 0,
                    "asks_total_until_now": 0,
                    "created_at": updated_at,
                },
            },
            upsert=True,
        )

    def set_week_counts(
        self,
        *,
        course_id: ObjectId,
        cluster_id: ObjectId,
        week_start: datetime,
        asks_before_week: int,
        updated_at: datetime,
    ) -> None:
        doc = self.cluster_weekly_stats.find_one(
            {"course_id": course_id, "cluster_id": cluster_id, "week_start": week_start},
            {"asks_this_week": 1},
        )
        asks_this_week = int((doc or {}).get("asks_this_week", 0))
        self.cluster_weekly_stats.update_one(
            {"course_id": course_id, "cluster_id": cluster_id, "week_start": week_start},
            {
                "$set": {
                    "asks_before_week": asks_before_week,
                    "asks_total_until_now": asks_before_week + asks_this_week,
                    "updated_at": updated_at,
                }
            },
            upsert=True,
        )
