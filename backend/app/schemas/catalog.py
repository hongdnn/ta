from __future__ import annotations

from pydantic import BaseModel


class InstitutionOption(BaseModel):
    id: str
    name: str
    type: str


class CourseOption(BaseModel):
    id: str
    institution_id: str
    code: str
    title: str


class InstitutionListResponse(BaseModel):
    items: list[InstitutionOption]


class CourseListResponse(BaseModel):
    items: list[CourseOption]
