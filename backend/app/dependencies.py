from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from fastapi import status as http_status

from app.chroma.client import get_chroma_collection
from app.chroma.cluster_store import ChromaClusterStore
from app.core.config import settings
from app.core.security import decode_access_token
from app.db.client import get_db
from app.repositories.cluster_repository import ClusterRepository
from app.repositories.cluster_weekly_stats_repository import ClusterWeeklyStatsRepository
from app.repositories.course_repository import CourseRepository
from app.repositories.institution_repository import InstitutionRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_context import AuthContext
from app.services.assist_service import AssistService
from app.services.auth_service import AuthService
from app.services.catalog_service import CatalogService
from app.services.session_service import SessionService


def get_auth_context(authorization: str | None = Header(default=None)) -> AuthContext:
    if not authorization:
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")
    token = parts[1].strip()
    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    email = payload.get("email")
    user_type = payload.get("user_type")
    return AuthContext(
        user_id=user_id.strip(),
        email=email if isinstance(email, str) else None,
        user_type=user_type if isinstance(user_type, str) else None,
    )


def get_user_repository() -> UserRepository:
    return UserRepository(get_db())


def get_institution_repository() -> InstitutionRepository:
    return InstitutionRepository(get_db())


def get_course_repository() -> CourseRepository:
    return CourseRepository(get_db())


def get_message_repository() -> MessageRepository:
    return MessageRepository(get_db())


def get_cluster_repository() -> ClusterRepository:
    return ClusterRepository(get_db())


def get_cluster_weekly_stats_repository() -> ClusterWeeklyStatsRepository:
    return ClusterWeeklyStatsRepository(get_db())


def get_session_repository() -> SessionRepository:
    return SessionRepository(get_db())


def get_chroma_cluster_store() -> ChromaClusterStore:
    return ChromaClusterStore(
        get_chroma_collection(),
        similarity_threshold=settings.chroma_similarity_threshold,
    )


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    institution_repo: InstitutionRepository = Depends(get_institution_repository),
) -> AuthService:
    return AuthService(user_repo=user_repo, institution_repo=institution_repo)


def get_catalog_service(
    institution_repo: InstitutionRepository = Depends(get_institution_repository),
    course_repo: CourseRepository = Depends(get_course_repository),
) -> CatalogService:
    return CatalogService(institution_repo=institution_repo, course_repo=course_repo)


def get_assist_service(
    message_repo: MessageRepository = Depends(get_message_repository),
    cluster_repo: ClusterRepository = Depends(get_cluster_repository),
    cluster_weekly_stats_repo: ClusterWeeklyStatsRepository = Depends(get_cluster_weekly_stats_repository),
    session_repo: SessionRepository = Depends(get_session_repository),
    chroma_cluster_store: ChromaClusterStore = Depends(get_chroma_cluster_store),
) -> AssistService:
    return AssistService(
        message_repo=message_repo,
        cluster_repo=cluster_repo,
        cluster_weekly_stats_repo=cluster_weekly_stats_repo,
        session_repo=session_repo,
        chroma_cluster_store=chroma_cluster_store,
    )


def get_session_service(
    session_repo: SessionRepository = Depends(get_session_repository),
) -> SessionService:
    return SessionService(session_repo=session_repo)
