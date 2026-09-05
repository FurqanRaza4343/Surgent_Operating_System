from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import require_role
from src.models.user import User, UserRole
from src.schemas.patient_photo import PatientPhotoResponse, UpdatePatientPhotoRequest
from src.controller.patient_photos.patient_photos_controllers import PatientPhotosController

router = APIRouter(tags=["Patient Photos"])
controller = PatientPhotosController()

# Clinical photography — Owner/Doctor only, same visibility boundary as
# clinical.py's consultation notes (deliberately excludes Receptionist).
_ROLES = (UserRole.OWNER, UserRole.DOCTOR)


@router.post("/patients/{patient_id}/photos", response_model=PatientPhotoResponse)
async def upload_photo(
    patient_id: UUID,
    file: UploadFile = File(...),
    photo_type: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    stage: str | None = Form(default=None),
    body_area: str | None = Form(default=None),
    procedure_id: UUID | None = Form(default=None),
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    file_bytes = await file.read()
    return await controller.upload_photo(
        db, user, patient_id, file_bytes, file.filename, photo_type, notes, stage, body_area, procedure_id
    )


@router.get("/patients/{patient_id}/photos", response_model=list[PatientPhotoResponse])
async def list_photos(
    patient_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_for_patient(db, user, patient_id)


@router.patch("/patient-photos/{photo_id}", response_model=PatientPhotoResponse)
async def update_photo(
    photo_id: UUID,
    data: UpdatePatientPhotoRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_photo(db, user, photo_id, data)


@router.delete("/patient-photos/{photo_id}", status_code=204)
async def delete_photo(
    photo_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    await controller.delete_photo(db, user, photo_id)
