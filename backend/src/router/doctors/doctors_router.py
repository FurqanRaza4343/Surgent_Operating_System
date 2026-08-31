from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user, require_role
from src.models.user import User, UserRole
from src.schemas.doctor import CreateDoctorRequest, UpdateDoctorRequest, DoctorResponse
from src.controller.doctors.doctors_controllers import DoctorsController

router = APIRouter(prefix="/doctors", tags=["Doctors"])
controller = DoctorsController()


@router.post("", response_model=DoctorResponse)
async def create_doctor(
    data: CreateDoctorRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_doctor(db, user, data)


@router.get("", response_model=list[DoctorResponse])
async def list_doctors(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_doctors(db, user)


@router.get("/me", response_model=DoctorResponse)
async def get_my_doctor(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    # Must be registered before /{doctor_id} — otherwise "me" is parsed as a
    # (rejected) UUID path param instead of matching this route.
    return await controller.get_my_doctor(db, user)


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_doctor(db, user, doctor_id)


@router.patch("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: UUID,
    data: UpdateDoctorRequest,
    # Owner-only — a Doctor editing another Doctor's record (or toggling
    # is_active, which now also flips the linked User's login access, see
    # doctors_services.py) is exactly the kind of Owner-level control a
    # Doctor must never have.
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_doctor(db, user, doctor_id, data)


@router.post("/{doctor_id}/invite", response_model=DoctorResponse)
async def invite_doctor(
    doctor_id: UUID,
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.invite_doctor(db, user, doctor_id)
