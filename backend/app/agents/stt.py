from __future__ import annotations

import os
from functools import lru_cache

from faster_whisper import WhisperModel


@lru_cache(maxsize=1)
def get_model() -> WhisperModel:
    model_name = os.getenv("WHISPER_MODEL", "distil-large-v3")
    device = os.getenv("WHISPER_DEVICE", "auto")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    return WhisperModel(model_name, device=device, compute_type=compute_type)


def transcribe_file(audio_path: str) -> tuple[str, str | None, float | None]:
    model = get_model()
    segments, info = model.transcribe(
        audio_path,
        vad_filter=True,
        beam_size=3,
    )

    transcript_parts: list[str] = []
    for segment in segments:
        if segment.text:
            transcript_parts.append(segment.text.strip())

    transcript = " ".join(part for part in transcript_parts if part).strip()
    duration = getattr(info, "duration", None)
    language = getattr(info, "language", None)
    return transcript, language, duration
