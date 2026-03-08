from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=6, max_length=200)
    user_type: str = Field(pattern="^(student|professor)$")
    institution_ids: list[str] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_user_type_rules(self) -> "RegisterRequest":
        # Professor account can belong to exactly one institution.
        if self.user_type == "professor" and len(self.institution_ids) != 1:
            raise ValueError("Professor account must have exactly one institution_id")
        return self


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AuthUser(BaseModel):
    id: str
    email: EmailStr
    name: str
    user_type: str
    status: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser
