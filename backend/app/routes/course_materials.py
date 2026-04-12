from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile, status

from app.dependencies import get_auth_context, get_course_material_service
from app.schemas.auth_context import AuthContext
from app.schemas.course_material import CourseMaterialListResponse, CourseMaterialOut, CourseMaterialViewUrlResponse
from app.services.course_material_service import CourseMaterialService


router = APIRouter(prefix="/api/course-materials", tags=["course-materials"])


@router.get("", response_model=CourseMaterialListResponse)
def list_course_materials(
    course_id: str = Query(..., min_length=1),
    auth: AuthContext = Depends(get_auth_context),
    service: CourseMaterialService = Depends(get_course_material_service),
):
    return service.list_materials(course_id=course_id, user_id=auth.user_id, user_type=auth.user_type)


@router.post("", response_model=CourseMaterialOut, status_code=status.HTTP_201_CREATED)
async def upload_course_material(
    background_tasks: BackgroundTasks,
    course_id: str = Form(..., min_length=1),
    file: UploadFile = File(...),
    auth: AuthContext = Depends(get_auth_context),
    service: CourseMaterialService = Depends(get_course_material_service),
):
    file_bytes = await file.read()
    material = service.create_material_upload(
        course_id=course_id,
        user_id=auth.user_id,
        user_type=auth.user_type,
        file_name=file.filename or "material",
        mime_type=file.content_type,
        file_bytes=file_bytes,
    )
    background_tasks.add_task(
        service.process_material_chunks,
        material_id=material.id,
        course_id=material.course_id,
        file_name=material.file_name,
        mime_type=material.mime_type,
        file_bytes=file_bytes,
    )
    return material


@router.get("/{material_id}/view-url", response_model=CourseMaterialViewUrlResponse)
def get_course_material_view_url(
    material_id: str,
    auth: AuthContext = Depends(get_auth_context),
    service: CourseMaterialService = Depends(get_course_material_service),
):
    return service.get_view_url(material_id=material_id, user_id=auth.user_id, user_type=auth.user_type)
