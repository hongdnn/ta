from __future__ import annotations

from app.repositories.course_repository import CourseRepository
from app.repositories.institution_repository import InstitutionRepository
from app.schemas.catalog import CourseListResponse, CourseOption, InstitutionListResponse, InstitutionOption


class CatalogService:
    def __init__(
        self,
        *,
        institution_repo: InstitutionRepository,
        course_repo: CourseRepository,
    ):
        self.institution_repo = institution_repo
        self.course_repo = course_repo

    def list_institutions(self) -> InstitutionListResponse:
        raw_items = self.institution_repo.list_active()
        return InstitutionListResponse(
            items=[
                InstitutionOption(
                    id=str(item["_id"]),
                    name=item["name"],
                    type=item["type"],
                )
                for item in raw_items
            ]
        )

    def list_courses(self, institution_id: str) -> CourseListResponse:
        raw_items = self.course_repo.list_active_by_institution(institution_id)
        return CourseListResponse(
            items=[
                CourseOption(
                    id=str(item["_id"]),
                    institution_id=str(item["institution_id"]),
                    code=item["code"],
                    title=item["title"],
                )
                for item in raw_items
            ]
        )
