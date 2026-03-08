from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class User(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    name: str = Field(min_length=1, max_length=200)
    user_type: str = Field(pattern="^(student|professor)$")
    password: str
    status: str = Field(default="active", pattern="^(active|suspended)$")
    created_at: datetime
    updated_at: datetime


class UserInstitution(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: object
    institution_id: object
    role: str = Field(pattern="^(student|professor)$")
    status: str = Field(default="active", pattern="^(active|inactive)$")
    created_at: datetime
    updated_at: datetime
