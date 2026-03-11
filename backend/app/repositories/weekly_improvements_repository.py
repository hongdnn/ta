from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from pymongo.database import Database


class WeeklyImprovementsRepository:
    def __init__(self, db: Database):
        self.weekly_improvements = db["weekly_improvements"]

    def get_for_range(
        self,
        *,
        course_id: ObjectId,
        week_start: datetime,
    ) -> dict[str, Any] | None:
        return self.weekly_improvements.find_one(
            {
                "course_id": course_id,
                "week_start": week_start,
            }
        )

    def upsert_for_range(
        self,
        *,
        course_id: ObjectId,
        week_start: datetime,
        question_fingerprint: list[str],
        improvements: list[dict[str, Any]],
        now: datetime,
    ) -> None:
        self.weekly_improvements.update_one(
            {
                "course_id": course_id,
                "week_start": week_start,
            },
            {
                "$set": {
                    "question_fingerprint": question_fingerprint,
                    "improvements": improvements,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "course_id": course_id,
                    "week_start": week_start,
                    "created_at": now,
                },
            },
            upsert=True,
        )
