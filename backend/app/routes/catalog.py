from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_auth_context, get_catalog_service
from app.schemas.auth_context import AuthContext
from app.schemas.catalog import CourseListResponse, InstitutionListResponse
from app.services.catalog_service import CatalogService


router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/institutions", response_model=InstitutionListResponse)
def list_institutions(service: CatalogService = Depends(get_catalog_service)):
    return service.list_institutions()


@router.get("/courses", response_model=CourseListResponse)
def list_courses(
    institution_id: str = Query(..., min_length=1),
    service: CatalogService = Depends(get_catalog_service),
):
    return service.list_courses(institution_id)


@router.get("/me/courses", response_model=CourseListResponse)
def list_my_courses(
    auth: AuthContext = Depends(get_auth_context),
    service: CatalogService = Depends(get_catalog_service),
):
    if auth.user_type != "professor":
        raise HTTPException(status_code=403, detail="Only professor accounts can access this resource")
    return service.list_courses_for_professor(auth.user_id)
