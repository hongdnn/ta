from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.dependencies import get_auth_service
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.services.auth_service import AuthService


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, service: AuthService = Depends(get_auth_service)):
    return service.register(payload)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)):
    return service.login(payload)
