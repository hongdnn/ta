from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CourseMaterialOut(BaseModel):
    id: str
    course_id: str
    user_id: str
    file_name: str
    mime_type: str
    file_size: int
    status: str
    created_at: datetime
    updated_at: datetime


class CourseMaterialListResponse(BaseModel):
    items: list[CourseMaterialOut]


class CourseMaterialViewUrlResponse(BaseModel):
    url: str
