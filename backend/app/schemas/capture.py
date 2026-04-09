from pydantic import BaseModel


class CaptureResponse(BaseModel):
    ok: bool
    intent: str = ""
    route: str = ""
    answer: str = ""
    language: str | None
    transcript: str
    ocr_text: str = ""
    frame_analysis: str = ""
    frame_activity_type: str = "lecture"
    duration_seconds: float | None = None
    audio_dbfs: float | None = None
    audio_peak_dbfs: float | None = None
