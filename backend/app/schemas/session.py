from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CreateSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_id: str = Field(min_length=1)


class CreateSessionResponse(BaseModel):
    session_id: str
    course_id: str
    session_status: str


class EndSessionResponse(BaseModel):
    session_id: str
    course_id: str
    session_status: str
    ended_at: datetime | None = None
