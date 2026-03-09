from __future__ import annotations

from fastapi import HTTPException

from app.repositories.session_repository import SessionRepository
from app.schemas.session import CreateSessionRequest, CreateSessionResponse, EndSessionResponse


class SessionService:
    def __init__(self, *, session_repo: SessionRepository):
        self.session_repo = session_repo

    def create_session(self, payload: CreateSessionRequest, *, user_id: str) -> CreateSessionResponse:
        try:
            doc = self.session_repo.create_session(course_id=payload.course_id, user_id=user_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        return CreateSessionResponse(
            session_id=str(doc["_id"]),
            course_id=str(doc["course_id"]),
            session_status=doc["session_status"],
        )

    def end_session(self, *, session_id: str, user_id: str) -> EndSessionResponse:
        try:
            doc = self.session_repo.end_session(session_id=session_id, user_id=user_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        if not doc:
            raise HTTPException(status_code=404, detail="Active session not found for user")

        return EndSessionResponse(
            session_id=str(doc["_id"]),
            course_id=str(doc["course_id"]),
            session_status=doc["session_status"],
            ended_at=doc.get("ended_at"),
        )
