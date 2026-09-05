from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import require_role
from src.models.user import User, UserRole
from src.schemas.surgery import (
    CreateSurgeryRequest,
    UpdateSurgeryRequest,
    CompleteSurgeryRequest,
    SurgeryResponse,
)
from src.controller.surgery.surgery_controllers import SurgeryController

router = APIRouter(prefix="/surgeries", tags=["Surgery"])
controller = SurgeryController()

# Clinical/surgical planning — Owner/Doctor only, same boundary as
# clinical.py's consultation notes and patient_photos_router.py.
_ROLES = (UserRole.OWNER, UserRole.DOCTOR)


@router.post("", response_model=SurgeryResponse)
async def create_surgery(
    data: CreateSurgeryRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_surgery(db, user, data)


@router.get("", response_model=list[SurgeryResponse])
async def list_surgeries(
    patient_id: UUID | None = Query(default=None),
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    if patient_id is not None:
        return await controller.list_for_patient(db, user, patient_id)
    return await controller.list_for_practice(db, user)


@router.get("/{surgery_id}", response_model=SurgeryResponse)
async def get_surgery(
    surgery_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_surgery(db, user, surgery_id)


@router.patch("/{surgery_id}", response_model=SurgeryResponse)
async def update_surgery(
    surgery_id: UUID,
    data: UpdateSurgeryRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_surgery(db, user, surgery_id, data)


@router.post("/{surgery_id}/complete", response_model=SurgeryResponse)
async def complete_surgery(
    surgery_id: UUID,
    data: CompleteSurgeryRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.complete_surgery(db, user, surgery_id, data)


@router.post("/{surgery_id}/cancel", response_model=SurgeryResponse)
async def cancel_surgery(
    surgery_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.cancel_surgery(db, user, surgery_id)
