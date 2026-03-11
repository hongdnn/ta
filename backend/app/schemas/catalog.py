from __future__ import annotations

from pydantic import BaseModel


class InstitutionOption(BaseModel):
    id: str
    name: str
    type: str
    timezone: str | None = None


class CourseOption(BaseModel):
    id: str
    institution_id: str
    institution_timezone: str | None = None
    code: str
    title: str


class InstitutionListResponse(BaseModel):
    items: list[InstitutionOption]


class CourseListResponse(BaseModel):
    items: list[CourseOption]
