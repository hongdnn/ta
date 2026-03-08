from __future__ import annotations

import math
import os
import shutil
import tempfile
import wave
from audioop import max as audio_max
from audioop import rms as audio_rms
from datetime import datetime, timezone
from pathlib import Path

from app.agents.assist_graph import run_assist
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


class AssistService:
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
        print("frame_analysis:")
        print(frame_analysis if frame_analysis else "(empty)")
        print("transcript:")
        print(transcript if transcript else "(empty)")
        print("answer:")
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
        return response_payload
