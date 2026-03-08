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

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


settings = Settings()
