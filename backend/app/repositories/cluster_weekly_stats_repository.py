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

    def list_for_week(
        self,
        *,
        course_id: ObjectId,
        week_start: datetime,
        limit: int,
    ) -> list[dict]:
        cursor = self.cluster_weekly_stats.find(
            {"course_id": course_id, "week_start": week_start, "asks_this_week": {"$gt": 0}}
        ).sort([("asks_this_week", -1), ("updated_at", -1)]).limit(limit)
        return list(cursor)

    def list_past_repeated_for_week(
        self,
        *,
        course_id: ObjectId,
        week_start: datetime,
        limit: int,
    ) -> list[dict]:
        cursor = self.cluster_weekly_stats.find(
            {
                "course_id": course_id,
                "week_start": week_start,
                "asks_this_week": {"$gt": 0},
                "asks_before_week": {"$gt": 0},
            }
        ).sort([("asks_total_until_now", -1), ("asks_this_week", -1), ("updated_at", -1)]).limit(limit)
        return list(cursor)

    def list_for_range(
        self,
        *,
        course_id: ObjectId,
        range_start_utc: datetime,
        range_end_utc: datetime,
        limit: int,
    ) -> list[dict]:
        cursor = self.cluster_weekly_stats.find(
            {
                "course_id": course_id,
                "asks_this_week": {"$gt": 0},
                "updated_at": {"$gte": range_start_utc, "$lt": range_end_utc},
            }
        ).sort([("asks_this_week", -1), ("updated_at", -1)]).limit(limit)
        return list(cursor)

    def list_past_repeated_for_range(
        self,
        *,
        course_id: ObjectId,
        range_start_utc: datetime,
        range_end_utc: datetime,
        limit: int,
    ) -> list[dict]:
        cursor = self.cluster_weekly_stats.find(
            {
                "course_id": course_id,
                "asks_this_week": {"$gt": 0},
                "asks_before_week": {"$gt": 0},
                "updated_at": {"$gte": range_start_utc, "$lt": range_end_utc},
            }
        ).sort([("asks_total_until_now", -1), ("asks_this_week", -1), ("updated_at", -1)]).limit(limit)
        return list(cursor)
