from __future__ import annotations

from fastapi import Depends

from app.db.client import get_db
from app.repositories.course_repository import CourseRepository
from app.repositories.institution_repository import InstitutionRepository
from app.repositories.user_repository import UserRepository
from app.services.assist_service import AssistService
from app.services.auth_service import AuthService
from app.services.catalog_service import CatalogService


def get_user_repository() -> UserRepository:
    return UserRepository(get_db())


def get_institution_repository() -> InstitutionRepository:
    return InstitutionRepository(get_db())


def get_course_repository() -> CourseRepository:
    return CourseRepository(get_db())


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


def get_assist_service() -> AssistService:
    return AssistService()
