from __future__ import annotations

import asyncio
import json
import math
import os
import re
import shutil
import tempfile
import wave
from audioop import max as audio_max
from audioop import rms as audio_rms
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from bson import ObjectId

from app.agents.assist_graph import run_assist, run_assist_stream
from app.chroma.cluster_store import ChromaClusterStore
from app.repositories.cluster_repository import ClusterRepository
from app.repositories.cluster_weekly_stats_repository import ClusterWeeklyStatsRepository
from app.repositories.course_repository import CourseRepository
from app.repositories.institution_repository import InstitutionRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.session_repository import SessionRepository
from app.schemas.capture import CaptureResponse


def _dbfs_from_int16(value: int) -> float:
    if value <= 0:
        return -120.0
    return 20 * math.log10(value / 32768.0)


def _wav_metrics(path: str) -> tuple[float | None, float | None]:
    try:
        with wave.open(path, "rb") as wav:
            width = wav.getsampwidth()
            if width != 2:
                return None, None
            frames = wav.readframes(wav.getnframes())
            if not frames:
                return -120.0, -120.0
            rms_value = audio_rms(frames, width)
            peak_value = audio_max(frames, width)
            return round(_dbfs_from_int16(rms_value), 2), round(_dbfs_from_int16(peak_value), 2)
    except Exception:  # noqa: BLE001
        return None, None


def _normalize_content(text: str) -> str:
    lowered = (text or "").lower().strip()
    lowered = re.sub(r"\s+", " ", lowered)
    return lowered


def _week_start_for_timezone_utc(dt: datetime, timezone_name: str | None) -> datetime:
    tz_name = (timezone_name or "").strip() or "UTC"
    try:
        local_tz = ZoneInfo(tz_name)
    except Exception:  # noqa: BLE001
        local_tz = timezone.utc
    local_dt = dt.astimezone(local_tz)
    local_midnight = datetime(local_dt.year, local_dt.month, local_dt.day, tzinfo=local_tz)
    local_week_start = local_midnight - timedelta(days=local_dt.weekday())
    return local_week_start.astimezone(timezone.utc)


class AssistService:
    def __init__(
        self,
        *,
        message_repo: MessageRepository,
        cluster_repo: ClusterRepository,
        cluster_weekly_stats_repo: ClusterWeeklyStatsRepository,
        session_repo: SessionRepository,
        course_repo: CourseRepository,
        institution_repo: InstitutionRepository,
        chroma_cluster_store: ChromaClusterStore,
    ):
        self.message_repo = message_repo
        self.cluster_repo = cluster_repo
        self.cluster_weekly_stats_repo = cluster_weekly_stats_repo
        self.session_repo = session_repo
        self.course_repo = course_repo
        self.institution_repo = institution_repo
        self.chroma_cluster_store = chroma_cluster_store

    @staticmethod
    def _sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    def _write_audio_temp(
        self,
        *,
        audio_bytes: bytes | None,
        audio_filename: str | None,
    ) -> tuple[str | None, float | None, float | None]:
        tmp_path: str | None = None
        rms_dbfs: float | None = None
        peak_dbfs: float | None = None
        if audio_bytes is None:
            return tmp_path, rms_dbfs, peak_dbfs

        suffix = Path(audio_filename or "capture.wav").suffix or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        rms_dbfs, peak_dbfs = _wav_metrics(tmp_path)
        print(
            f"[TA-BACKEND] audio-bytes={len(audio_bytes)} rms_dbfs={rms_dbfs} peak_dbfs={peak_dbfs}",
            flush=True,
        )

        if os.getenv("DEBUG_KEEP_AUDIO", "0") == "1":
            debug_dir = Path(os.getenv("DEBUG_AUDIO_DIR", "debug-audio"))
            debug_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            debug_path = debug_dir / f"capture-{stamp}{suffix}"
            shutil.copy2(tmp_path, debug_path)
            print(f"[TA-BACKEND] Saved debug audio to {debug_path}", flush=True)

        return tmp_path, rms_dbfs, peak_dbfs

    def _print_capture_log(
        self,
        *,
        source_id: str | None,
        source_type: str | None,
        course_name: str | None,
        capture_duration_seconds: int | None,
        captured_at: str | None,
        intent: str,
        route: str,
        frame_activity_type: str,
        capture_triggered: bool,
        user_text: str,
        language: str | None,
        duration: float | None,
        rms_dbfs: float | None,
        peak_dbfs: float | None,
        frame_analysis: str,
        frame_bytes: bytes | None,
        transcript: str,
        answer: str,
    ) -> None:
        print("\n=== TA CAPTURE RECEIVED ===")
        print(f"sourceId={source_id} sourceType={source_type} courseName={course_name}")
        print(f"captureDurationSeconds={capture_duration_seconds} capturedAt={captured_at}")
        print(f"intent={intent} route={route} activityType={frame_activity_type} captureTriggered={capture_triggered}")
        print(f"userText={user_text if user_text else '(empty)'}")
        print(f"language={language} duration={duration}")
        print(f"rms_dbfs={rms_dbfs} peak_dbfs={peak_dbfs}")
        print("\nIMAGE ANALYSIS:")
        if frame_analysis:
            print(frame_analysis)
        elif frame_bytes is not None:
            print("(handled inside tutor multimodal call)")
        else:
            print("(empty)")
        print("\nTRANSCRIPT:")
        print(transcript if transcript else "(empty)")
        print("\nANSWER:")
        print(answer if answer else "(empty)")
        print("=== END CAPTURE ===\n")

    async def process_capture(
        self,
        *,
        audio_bytes: bytes | None,
        audio_filename: str | None,
        frame_bytes: bytes | None,
        user_text: str,
        session_id: str,
        capture_triggered: bool,
        source_id: str | None,
        source_type: str | None,
        capture_duration_seconds: int | None,
        course_name: str | None,
        captured_at: str | None,
        user_id: str,
    ) -> CaptureResponse:
        tmp_path: str | None = None
        rms_dbfs: float | None = None
        peak_dbfs: float | None = None
        language = None
        duration = None

        tmp_path, rms_dbfs, peak_dbfs = self._write_audio_temp(
            audio_bytes=audio_bytes,
            audio_filename=audio_filename,
        )

        if frame_bytes is not None:
            print(f"[TA-BACKEND] frame-bytes={len(frame_bytes)}", flush=True)

        try:
            result = run_assist(
                session_id=session_id,
                user_text=user_text,
                capture_triggered=capture_triggered,
                audio_tmp_path=tmp_path,
                frame_bytes=frame_bytes,
            )
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

        transcript = result.get("transcript", "")
        frame_analysis = result.get("frame_analysis", "")
        frame_activity_type = (result.get("frame_activity_type") or "lecture").strip()
        if frame_activity_type not in {"lecture", "assignment"}:
            frame_activity_type = "lecture"
        answer = result.get("answer", "")
        intent = result.get("intent", "")
        route = result.get("route", "")
        language = result.get("language", language)
        duration = result.get("duration_seconds", duration)

        self._print_capture_log(
            source_id=source_id,
            source_type=source_type,
            course_name=course_name,
            capture_duration_seconds=capture_duration_seconds,
            captured_at=captured_at,
            intent=intent,
            route=route,
            frame_activity_type=frame_activity_type,
            capture_triggered=capture_triggered,
            user_text=user_text,
            language=language,
            duration=duration,
            rms_dbfs=rms_dbfs,
            peak_dbfs=peak_dbfs,
            frame_analysis=frame_analysis,
            frame_bytes=frame_bytes,
            transcript=transcript,
            answer=answer,
        )

        response_payload = CaptureResponse(
            ok=True,
            intent=intent,
            route=route,
            answer=answer,
            language=language,
            transcript=transcript,
            ocr_text="",
            frame_analysis=frame_analysis,
            frame_activity_type=frame_activity_type,
            duration_seconds=duration,
            audio_dbfs=rms_dbfs,
            audio_peak_dbfs=peak_dbfs,
        )
        print("\n=== TA RESPONSE TO FRONTEND ===")
        print(f"ok={response_payload.ok} intent={response_payload.intent} route={response_payload.route}")
        print(f"answer_len={len(response_payload.answer)} transcript_len={len(response_payload.transcript)}")
        print(f"frame_analysis_len={len(response_payload.frame_analysis)}")
        print("=== END RESPONSE ===\n")

        asyncio.create_task(
            asyncio.to_thread(
                self._persist_interaction_sync,
                session_id=session_id,
                user_text=user_text,
                answer=answer,
                captured_at=captured_at,
                intent=intent,
                activity_type=frame_activity_type,
                user_id=user_id,
            )
        )
        return response_payload

    async def stream_capture(
        self,
        *,
        audio_bytes: bytes | None,
        audio_filename: str | None,
        frame_bytes: bytes | None,
        user_text: str,
        session_id: str,
        capture_triggered: bool,
        source_id: str | None,
        source_type: str | None,
        capture_duration_seconds: int | None,
        course_name: str | None,
        captured_at: str | None,
        user_id: str,
    ):
        tmp_path, rms_dbfs, peak_dbfs = self._write_audio_temp(
            audio_bytes=audio_bytes,
            audio_filename=audio_filename,
        )

        if frame_bytes is not None:
            print(f"[TA-BACKEND] frame-bytes={len(frame_bytes)}", flush=True)

        final_state: dict = {}
        try:
            yield self._sse("status", {"step": "processing"})
            for event in run_assist_stream(
                session_id=session_id,
                user_text=user_text,
                capture_triggered=capture_triggered,
                audio_tmp_path=tmp_path,
                frame_bytes=frame_bytes,
            ):
                event_type = str(event.get("type", ""))
                if event_type == "answer_delta":
                    yield self._sse("answer_delta", {"text": str(event.get("text", ""))})
                elif event_type == "context":
                    context_state = event.get("state", {}) or {}
                    yield self._sse(
                        "context",
                        {
                            "language": context_state.get("language"),
                            "duration_seconds": context_state.get("duration_seconds"),
                            "transcript_len": len(str(context_state.get("transcript", ""))),
                        },
                    )
                elif event_type == "final_state":
                    final_state = event.get("state", {}) or {}
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

        transcript = str(final_state.get("transcript", "") or "")
        frame_analysis = str(final_state.get("frame_analysis", "") or "")
        frame_activity_type = str(final_state.get("frame_activity_type") or "lecture").strip()
        if frame_activity_type not in {"lecture", "assignment"}:
            frame_activity_type = "lecture"
        answer = str(final_state.get("answer", "") or "")
        intent = str(final_state.get("intent", "") or "")
        route = str(final_state.get("route", "") or intent)
        language = final_state.get("language")
        duration = final_state.get("duration_seconds")

        self._print_capture_log(
            source_id=source_id,
            source_type=source_type,
            course_name=course_name,
            capture_duration_seconds=capture_duration_seconds,
            captured_at=captured_at,
            intent=intent,
            route=route,
            frame_activity_type=frame_activity_type,
            capture_triggered=capture_triggered,
            user_text=user_text,
            language=language,
            duration=duration,
            rms_dbfs=rms_dbfs,
            peak_dbfs=peak_dbfs,
            frame_analysis=frame_analysis,
            frame_bytes=frame_bytes,
            transcript=transcript,
            answer=answer,
        )

        response_payload = CaptureResponse(
            ok=True,
            intent=intent,
            route=route,
            answer=answer,
            language=language,
            transcript=transcript,
            ocr_text="",
            frame_analysis=frame_analysis,
            frame_activity_type=frame_activity_type,
            duration_seconds=duration,
            audio_dbfs=rms_dbfs,
            audio_peak_dbfs=peak_dbfs,
        )
        print("\n=== TA RESPONSE TO FRONTEND ===")
        print(f"ok={response_payload.ok} intent={response_payload.intent} route={response_payload.route}")
        print(f"answer_len={len(response_payload.answer)} transcript_len={len(response_payload.transcript)}")
        print(f"frame_analysis_len={len(response_payload.frame_analysis)}")
        print("=== END RESPONSE ===\n")

        asyncio.create_task(
            asyncio.to_thread(
                self._persist_interaction_sync,
                session_id=session_id,
                user_text=user_text,
                answer=answer,
                captured_at=captured_at,
                intent=intent,
                activity_type=frame_activity_type,
                user_id=user_id,
            )
        )
        yield self._sse("final", response_payload.model_dump())

    def _persist_interaction_sync(
        self,
        *,
        session_id: str,
        user_text: str,
        answer: str,
        captured_at: str | None,
        intent: str,
        activity_type: str,
        user_id: str,
    ) -> None:
        try:
            if activity_type not in {"lecture", "assignment"}:
                activity_type = "lecture"
            if not ObjectId.is_valid(user_id):
                print("[TA-BACKEND][persist] skipped: invalid user id for analytics", flush=True)
                return
            user_oid = ObjectId(user_id)
            session_doc = self.session_repo.get_session_by_id(session_id)
            if session_doc is None:
                print("[TA-BACKEND][persist] skipped: invalid session id for analytics", flush=True)
                return
            course_id = session_doc.get("course_id")
            session_oid = session_doc.get("_id")
            session_user_id = session_doc.get("user_id")
            if not isinstance(course_id, ObjectId) or not isinstance(session_oid, ObjectId):
                print("[TA-BACKEND][persist] skipped: malformed session document", flush=True)
                return
            if not isinstance(session_user_id, ObjectId) or session_user_id != user_oid:
                print("[TA-BACKEND][persist] skipped: session does not belong to authenticated user", flush=True)
                return
            institution_timezone = "UTC"
            course_doc = self.course_repo.get_by_id(str(course_id))
            if course_doc is not None:
                institution_id = course_doc.get("institution_id")
                if isinstance(institution_id, ObjectId):
                    institution_doc = self.institution_repo.get_by_id(str(institution_id))
                    raw_timezone = institution_doc.get("timezone") if institution_doc else None
                    if isinstance(raw_timezone, str) and raw_timezone.strip():
                        institution_timezone = raw_timezone.strip()

            now = datetime.now(timezone.utc)
            normalized_user_text = _normalize_content(user_text)
            normalized_answer = _normalize_content(answer)
            user_content = user_text if user_text is not None else ""
            agent_content = (answer or "").strip()

            user_message_id = self.message_repo.create_message(
                session_id=session_oid,
                course_id=course_id,
                creator="user",
                user_id=user_oid,
                content=user_content,
                content_normalized=normalized_user_text,
                activity_type=activity_type,
                answer_to_message_id=None,
                cluster_id=None,
                created_at=now,
                updated_at=now,
            )

            cluster_id = None
            if activity_type == "lecture" and intent != "context_only":
                if not self.chroma_cluster_store.enabled:
                    print(
                        f"[TA-BACKEND][persist] clustering skipped: CHROMA_ENABLED is off "
                        f"course_id={str(course_id)}",
                        flush=True,
                    )
                else:
                    created_new_cluster = False
                    match = self.chroma_cluster_store.find_best_cluster(
                        course_id=str(course_id),
                        text=user_content,
                    )
                    if self.chroma_cluster_store.is_match(match):
                        raw_cluster_id = (match.cluster_id if match else "").strip()
                        if ObjectId.is_valid(raw_cluster_id):
                            cluster_id = ObjectId(raw_cluster_id)

                    if cluster_id is None:
                        cluster_id = self.cluster_repo.create_cluster(
                            course_id=course_id,
                            representative_message_id=user_message_id,
                            created_at=now,
                            updated_at=now,
                        )
                        created_new_cluster = True

                    self.message_repo.set_cluster(user_message_id, cluster_id, now)

                    if created_new_cluster:
                        self.chroma_cluster_store.upsert_cluster(
                            cluster_id=str(cluster_id),
                            text=user_content,
                            course_id=str(course_id),
                            representative_message_id=str(user_message_id),
                            created_at_iso=now.isoformat(),
                            updated_at_iso=now.isoformat(),
                        )

            self.message_repo.create_message(
                session_id=session_oid,
                course_id=course_id,
                creator="agent",
                user_id=user_oid,
                content=agent_content,
                content_normalized=normalized_answer,
                activity_type=activity_type,
                answer_to_message_id=user_message_id,
                cluster_id=cluster_id,
                created_at=now,
                updated_at=now,
            )

            if cluster_id is not None:
                week_anchor = now
                if captured_at:
                    try:
                        week_anchor = datetime.fromisoformat(captured_at.replace("Z", "+00:00")).astimezone(timezone.utc)
                    except Exception:  # noqa: BLE001
                        week_anchor = now
                week_start = _week_start_for_timezone_utc(week_anchor, institution_timezone)

                self.cluster_weekly_stats_repo.increment_week_asks(
                    course_id=course_id,
                    cluster_id=cluster_id,
                    week_start=week_start,
                    updated_at=now,
                )
                asks_before_week = self.message_repo.count_user_messages_for_cluster_before(
                    course_id=course_id,
                    cluster_id=cluster_id,
                    before_date=week_start,
                )
                self.cluster_weekly_stats_repo.set_week_counts(
                    course_id=course_id,
                    cluster_id=cluster_id,
                    week_start=week_start,
                    asks_before_week=asks_before_week,
                    updated_at=now,
                )

                print(
                    f"[TA-BACKEND][persist] saved messages + cluster stats "
                    f"course_id={str(course_id)} cluster_id={str(cluster_id)} asks_before_week={asks_before_week}",
                    flush=True,
                )
            else:
                print(
                    f"[TA-BACKEND][persist] saved messages only (cluster skipped) "
                    f"course_id={str(course_id)} intent={intent} activity_type={activity_type}",
                    flush=True,
                )
        except Exception as exc:  # noqa: BLE001
            print(f"[TA-BACKEND][persist] failed: {exc}", flush=True)
