from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None:
        return default
    cleaned = value.strip()
    return cleaned if cleaned else default


def _env_int(name: str, default: int) -> int:
    raw = _env(name, str(default))
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = _env(name, str(default))
    try:
        return float(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    app_name: str = "TA Backend"
    app_version: str = "0.1.0"
    cors_origins_raw: str = _env("CORS_ORIGINS", "http://localhost:8080")
    mongo_url: str = _env("MONGODB_URL", "")
    mongo_db_name: str = _env("MONGODB_DB_NAME", "ta")
    jwt_secret: str = _env("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = _env("JWT_ALGORITHM", "HS256")
    jwt_exp_minutes: int = _env_int("JWT_EXP_MINUTES", 10080)  # 7 days
    mongo_init_on_startup: bool = _env("MONGO_INIT_ON_STARTUP", "0") == "1"
    chroma_enabled: bool = _env("CHROMA_ENABLED", "0") == "1"
    chroma_api_key: str = _env("CHROMA_API_KEY", "")
    chroma_tenant: str = _env("CHROMA_TENANT", "")
    chroma_database: str = _env("CHROMA_DATABASE", "")
    chroma_similarity_threshold: float = 0.2
    chroma_material_rerank_score_threshold: float = _env_float("CHROMA_MATERIAL_RERANK_SCORE_THRESHOLD", 0.8)
    cohere_api_key: str = _env("COHERE_API_KEY", "")
    cohere_rerank_model: str = _env("COHERE_RERANK_MODEL", "rerank-v4.0-pro")
    r2_account_id: str = _env("R2_ACCOUNT_ID", "")
    r2_access_key_id: str = _env("R2_ACCESS_KEY_ID", "")
    r2_secret_access_key: str = _env("R2_SECRET_ACCESS_KEY", "")
    r2_bucket_name: str = _env("R2_BUCKET_NAME", "")
    r2_presigned_url_expires_seconds: int = _env_int("R2_PRESIGNED_URL_EXPIRES_SECONDS", 900)

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


settings = Settings()
