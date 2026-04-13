from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.dependencies import get_assist_service, get_auth_context
from app.schemas.auth_context import AuthContext
from app.schemas.capture import CaptureResponse
from app.services.assist_service import AssistService


router = APIRouter(prefix="/api", tags=["assist"])


@router.post("/assist", response_model=CaptureResponse)
async def create_capture(
    audio: UploadFile | None = File(default=None),
    frame: UploadFile | None = File(default=None),
    userText: str | None = Form(default=""),
    sessionId: str | None = Form(default="default"),
    captureTriggered: str | None = Form(default="true"),
    sourceId: str | None = Form(default=None),
    sourceType: str | None = Form(default=None),
    captureDurationSeconds: int | None = Form(default=None),
    courseName: str | None = Form(default=None),
    capturedAt: str | None = Form(default=None),
    auth: AuthContext = Depends(get_auth_context),
    service: AssistService = Depends(get_assist_service),
):
    capture_triggered = (captureTriggered or "false").lower() in {"true", "1", "yes", "on"}
    session_id = (sessionId or "default").strip() or "default"
    user_text = userText if userText is not None else ""
    audio_bytes = await audio.read() if audio is not None else None
    frame_bytes = await frame.read() if frame is not None else None
    try:
        return await service.process_capture(
            audio_bytes=audio_bytes,
            audio_filename=audio.filename if audio is not None else None,
            frame_bytes=frame_bytes,
            session_id=session_id,
            user_text=user_text,
            capture_triggered=capture_triggered,
            source_id=sourceId,
            source_type=sourceType,
            capture_duration_seconds=captureDurationSeconds,
            course_name=courseName,
            captured_at=capturedAt,
            user_id=auth.user_id,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[BACKEND] Assist pipeline failed: {exc}", flush=True)
        raise HTTPException(status_code=422, detail=f"Assist pipeline failed: {exc}") from exc


@router.post("/assist/stream")
async def create_capture_stream(
    audio: UploadFile | None = File(default=None),
    frame: UploadFile | None = File(default=None),
    userText: str | None = Form(default=""),
    sessionId: str | None = Form(default="default"),
    captureTriggered: str | None = Form(default="true"),
    sourceId: str | None = Form(default=None),
    sourceType: str | None = Form(default=None),
    captureDurationSeconds: int | None = Form(default=None),
    courseName: str | None = Form(default=None),
    capturedAt: str | None = Form(default=None),
    auth: AuthContext = Depends(get_auth_context),
    service: AssistService = Depends(get_assist_service),
):
    capture_triggered = (captureTriggered or "false").lower() in {"true", "1", "yes", "on"}
    session_id = (sessionId or "default").strip() or "default"
    user_text = userText if userText is not None else ""
    audio_bytes = await audio.read() if audio is not None else None
    frame_bytes = await frame.read() if frame is not None else None
    return StreamingResponse(
        service.stream_capture(
            audio_bytes=audio_bytes,
            audio_filename=audio.filename if audio is not None else None,
            frame_bytes=frame_bytes,
            session_id=session_id,
            user_text=user_text,
            capture_triggered=capture_triggered,
            source_id=sourceId,
            source_type=sourceType,
            capture_duration_seconds=captureDurationSeconds,
            course_name=courseName,
            captured_at=capturedAt,
            user_id=auth.user_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
