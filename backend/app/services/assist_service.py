from __future__ import annotations

import asyncio
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

from bson import ObjectId

from app.agents.assist_graph import run_assist
from app.chroma.cluster_store import ChromaClusterStore
from app.repositories.cluster_repository import ClusterRepository
from app.repositories.cluster_weekly_stats_repository import ClusterWeeklyStatsRepository
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


def _week_start_utc(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc) - timedelta(days=dt.weekday())


class AssistService:
    def __init__(
        self,
        *,
        message_repo: MessageRepository,
        cluster_repo: ClusterRepository,
        cluster_weekly_stats_repo: ClusterWeeklyStatsRepository,
        session_repo: SessionRepository,
        chroma_cluster_store: ChromaClusterStore,
    ):
        self.message_repo = message_repo
        self.cluster_repo = cluster_repo
        self.cluster_weekly_stats_repo = cluster_weekly_stats_repo
        self.session_repo = session_repo
        self.chroma_cluster_store = chroma_cluster_store

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

        if audio_bytes is not None:
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
        answer = result.get("answer", "")
        intent = result.get("intent", "")
        route = result.get("route", "")
        context_summary = result.get("context_summary", "")
        language = result.get("language", language)
        duration = result.get("duration_seconds", duration)

        print("\n=== TA CAPTURE RECEIVED ===")
        print(f"sourceId={source_id} sourceType={source_type} courseName={course_name}")
        print(f"captureDurationSeconds={capture_duration_seconds} capturedAt={captured_at}")
        print(f"intent={intent} route={route} captureTriggered={capture_triggered}")
        print(f"userText={user_text if user_text else '(empty)'}")
        print(f"language={language} duration={duration}")
        print(f"rms_dbfs={rms_dbfs} peak_dbfs={peak_dbfs}")
        print("\nIMAGE ANALYSIS:")
        print(frame_analysis if frame_analysis else "(empty)")
        print("\nTRANSCRIPT:")
        print(transcript if transcript else "(empty)")
        print("\nANSWER:")
        print(answer if answer else "(empty)")
        print("=== END CAPTURE ===\n")

        response_payload = CaptureResponse(
            ok=True,
            intent=intent,
            route=route,
            answer=answer,
            language=language,
            transcript=transcript,
            ocr_text="",
            frame_analysis=frame_analysis,
            context_summary=context_summary,
            duration_seconds=duration,
            audio_dbfs=rms_dbfs,
            audio_peak_dbfs=peak_dbfs,
        )
        print("\n=== TA RESPONSE TO FRONTEND ===")
        print(f"ok={response_payload.ok} intent={response_payload.intent} route={response_payload.route}")
        print(f"answer_len={len(response_payload.answer)} transcript_len={len(response_payload.transcript)}")
        print(f"frame_analysis_len={len(response_payload.frame_analysis)} context_summary_len={len(response_payload.context_summary)}")
        print("=== END RESPONSE ===\n")

        asyncio.create_task(
            asyncio.to_thread(
                self._persist_interaction_sync,
                session_id=session_id,
                user_text=user_text,
                answer=answer,
                captured_at=captured_at,
                intent=intent,
                user_id=user_id,
            )
        )
        return response_payload

    def _persist_interaction_sync(
        self,
        *,
        session_id: str,
        user_text: str,
        answer: str,
        captured_at: str | None,
        intent: str,
        user_id: str,
    ) -> None:
        try:
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
                answer_to_message_id=None,
                cluster_id=None,
                created_at=now,
                updated_at=now,
            )

            cluster_id = None
            if intent != "context_only":
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
                week_start = _week_start_utc(week_anchor)

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
                    f"course_id={str(course_id)} intent={intent}",
                    flush=True,
                )
        except Exception as exc:  # noqa: BLE001
            print(f"[TA-BACKEND][persist] failed: {exc}", flush=True)
