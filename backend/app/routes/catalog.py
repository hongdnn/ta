from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_catalog_service
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
