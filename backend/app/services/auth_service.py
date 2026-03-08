from __future__ import annotations

from fastapi import HTTPException

from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.institution_repository import InstitutionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, AuthUser, LoginRequest, RegisterRequest


class AuthService:
    def __init__(self, *, user_repo: UserRepository, institution_repo: InstitutionRepository):
        self.user_repo = user_repo
        self.institution_repo = institution_repo

    def register(self, payload: RegisterRequest) -> AuthResponse:
        existing = self.user_repo.get_by_email(str(payload.email))
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        for institution_id in payload.institution_ids:
            if not self.institution_repo.exists_by_id(institution_id):
                raise HTTPException(status_code=404, detail=f"Institution not found: {institution_id}")

        user = self.user_repo.create_user(
            email=str(payload.email),
            name=payload.name,
            user_type=payload.user_type,
            password=hash_password(payload.password),
            institution_ids=payload.institution_ids,
        )
        return self._build_auth_response(user)

    def login(self, payload: LoginRequest) -> AuthResponse:
        user = self.user_repo.get_by_email(str(payload.email))
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not verify_password(payload.password, user.get("password", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return self._build_auth_response(user)

    def _build_auth_response(self, user: dict) -> AuthResponse:
        user_id = str(user["_id"])
        token = create_access_token(
            subject=user_id,
            extra_claims={
                "email": user["email"],
                "user_type": user["user_type"],
            },
        )
        return AuthResponse(
            access_token=token,
            user=AuthUser(
                id=user_id,
                email=user["email"],
                name=user["name"],
                user_type=user["user_type"],
                status=user["status"],
            ),
        )
