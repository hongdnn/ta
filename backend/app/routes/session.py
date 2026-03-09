from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.dependencies import get_auth_context, get_session_service
from app.schemas.auth_context import AuthContext
from app.schemas.session import CreateSessionRequest, CreateSessionResponse, EndSessionResponse
from app.services.session_service import SessionService


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: CreateSessionRequest,
    auth: AuthContext = Depends(get_auth_context),
    service: SessionService = Depends(get_session_service),
):
    return service.create_session(payload, user_id=auth.user_id)


@router.post("/{session_id}/end", response_model=EndSessionResponse)
def end_session(
    session_id: str,
    auth: AuthContext = Depends(get_auth_context),
    service: SessionService = Depends(get_session_service),
):
    return service.end_session(session_id=session_id, user_id=auth.user_id)
