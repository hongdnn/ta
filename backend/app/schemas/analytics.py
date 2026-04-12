from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CourseQuestionsQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_id: str = Field(min_length=1)
    range_start_utc: str = Field(min_length=1)
    range_end_utc: str = Field(min_length=1)
    timezone: str = Field(default="UTC", min_length=1)
    limit_top: int = Field(default=5, ge=1, le=20)
    limit_past: int = Field(default=5, ge=1, le=30)


class TopQuestionItem(BaseModel):
    cluster_id: str
    question: str
    asks_this_week: int


class PastQuestionItem(BaseModel):
    cluster_id: str
    question: str
    asks_before_week: int
    asks_this_week: int
    asks_total_until_now: int


class ReviewMaterialItem(BaseModel):
    material_id: str
    file_name: str
    page: int
    score: float


class WeeklyImprovementItem(BaseModel):
    cluster_id: str
    question: str
    asks_this_week: int
    asks_before_week: int
    asks_total_until_now: int
    problem: str
    title: str
    solution: str
    review_materials: list[ReviewMaterialItem] = Field(default_factory=list)


class CourseQuestionsAnalyticsResponse(BaseModel):
    course_id: str
    timezone: str
    range_start_utc: str
    range_end_utc: str
    top_questions_this_week: list[TopQuestionItem]
    past_questions: list[PastQuestionItem]
    weekly_improvements: list[WeeklyImprovementItem]
