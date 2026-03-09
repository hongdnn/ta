from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_analytics_service, get_auth_context
from app.schemas.analytics import CourseQuestionsAnalyticsResponse, CourseQuestionsQuery
from app.schemas.auth_context import AuthContext
from app.services.analytics_service import AnalyticsService


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/course-questions", response_model=CourseQuestionsAnalyticsResponse)
def get_course_questions(
    course_id: str = Query(..., min_length=1),
    range_start_utc: str = Query(..., min_length=1),
    range_end_utc: str = Query(..., min_length=1),
    timezone: str = Query("UTC", min_length=1),
    limit_top: int = Query(5, ge=1, le=20),
    limit_past: int = Query(10, ge=1, le=30),
    auth: AuthContext = Depends(get_auth_context),
    service: AnalyticsService = Depends(get_analytics_service),
):
    payload = CourseQuestionsQuery(
        course_id=course_id,
        range_start_utc=range_start_utc,
        range_end_utc=range_end_utc,
        timezone=timezone,
        limit_top=limit_top,
        limit_past=limit_past,
    )
    return service.get_course_questions_analytics(payload=payload, user_id=auth.user_id, user_type=auth.user_type)
