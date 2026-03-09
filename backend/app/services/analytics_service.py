from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException

from app.repositories.cluster_repository import ClusterRepository
from app.repositories.cluster_weekly_stats_repository import ClusterWeeklyStatsRepository
from app.repositories.course_repository import CourseRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.user_repository import UserRepository
from app.schemas.analytics import (
    CourseQuestionsAnalyticsResponse,
    CourseQuestionsQuery,
    PastQuestionItem,
    TopQuestionItem,
)


def _parse_utc_iso(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(timezone.utc)


class AnalyticsService:
    def __init__(
        self,
        *,
        course_repo: CourseRepository,
        user_repo: UserRepository,
        cluster_repo: ClusterRepository,
        message_repo: MessageRepository,
        cluster_weekly_stats_repo: ClusterWeeklyStatsRepository,
    ):
        self.course_repo = course_repo
        self.user_repo = user_repo
        self.cluster_repo = cluster_repo
        self.message_repo = message_repo
        self.cluster_weekly_stats_repo = cluster_weekly_stats_repo

    def get_course_questions_analytics(
        self,
        *,
        payload: CourseQuestionsQuery,
        user_id: str,
        user_type: str | None,
    ) -> CourseQuestionsAnalyticsResponse:
        if user_type != "professor":
            raise HTTPException(status_code=403, detail="Only professor accounts can access this resource")

        if not ObjectId.is_valid(payload.course_id):
            raise HTTPException(status_code=422, detail="Invalid course_id")
        course_doc = self.course_repo.get_by_id(payload.course_id)
        if not course_doc:
            raise HTTPException(status_code=404, detail="Course not found")

        professor_institutions = set(self.user_repo.list_institution_ids(user_id=user_id, role="professor"))
        course_institution = str(course_doc.get("institution_id"))
        if course_institution not in professor_institutions:
            raise HTTPException(status_code=403, detail="You do not have access to this course")

        try:
            range_start_utc = _parse_utc_iso(payload.range_start_utc)
            range_end_utc = _parse_utc_iso(payload.range_end_utc)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=422, detail="Invalid range_start_utc/range_end_utc") from exc
        if range_end_utc <= range_start_utc:
            raise HTTPException(status_code=422, detail="range_end_utc must be greater than range_start_utc")

        course_oid = ObjectId(payload.course_id)
        top_rows = self.cluster_weekly_stats_repo.list_for_range(
            course_id=course_oid,
            range_start_utc=range_start_utc,
            range_end_utc=range_end_utc,
            limit=payload.limit_top,
        )
        past_rows = self.cluster_weekly_stats_repo.list_past_repeated_for_range(
            course_id=course_oid,
            range_start_utc=range_start_utc,
            range_end_utc=range_end_utc,
            limit=payload.limit_past,
        )
        cluster_ids = [row["cluster_id"] for row in [*top_rows, *past_rows] if isinstance(row.get("cluster_id"), ObjectId)]
        unique_cluster_ids = list(dict.fromkeys(cluster_ids))
        cluster_docs = self.cluster_repo.find_by_ids(unique_cluster_ids)
        representative_message_ids = [
            c.get("representative_message_id")
            for c in cluster_docs
            if isinstance(c.get("representative_message_id"), ObjectId)
        ]
        message_docs = self.message_repo.find_by_ids(representative_message_ids)
        message_by_id = {str(m["_id"]): m for m in message_docs}
        cluster_question_by_id: dict[str, str] = {}
        for cluster in cluster_docs:
            cid = str(cluster["_id"])
            rep_id = cluster.get("representative_message_id")
            if isinstance(rep_id, ObjectId):
                cluster_question_by_id[cid] = str(message_by_id.get(str(rep_id), {}).get("content", "")).strip()

        top_items = [
            TopQuestionItem(
                cluster_id=str(row["cluster_id"]),
                question=cluster_question_by_id.get(str(row["cluster_id"]), "(missing question)"),
                asks_this_week=int(row.get("asks_this_week", 0)),
            )
            for row in top_rows
        ]

        past_items = [
            PastQuestionItem(
                cluster_id=str(row["cluster_id"]),
                question=cluster_question_by_id.get(str(row["cluster_id"]), "(missing question)"),
                asks_before_week=int(row.get("asks_before_week", 0)),
                asks_this_week=int(row.get("asks_this_week", 0)),
                asks_total_until_now=int(row.get("asks_total_until_now", 0)),
            )
            for row in past_rows
        ]

        return CourseQuestionsAnalyticsResponse(
            course_id=payload.course_id,
            timezone=payload.timezone,
            range_start_utc=range_start_utc.isoformat(),
            range_end_utc=range_end_utc.isoformat(),
            top_questions_this_week=top_items,
            past_questions=past_items,
        )
