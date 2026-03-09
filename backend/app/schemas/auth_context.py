from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class AuthContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    email: str | None = None
    user_type: str | None = None

