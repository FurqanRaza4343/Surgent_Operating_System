from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.appointment import (
    AppointmentResponse,
    CreateAppointmentRequest,
    RescheduleAppointmentRequest,
    CancelAppointmentRequest,
)
from src.controller.appointments.appointments_controllers import AppointmentsController

router = APIRouter(prefix="/appointments", tags=["Appointments"])
controller = AppointmentsController()


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments(
    doctor_id: str = Query(default="me"),
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    # Only "me" (the caller's own linked Doctor row) is supported for now —
    # real cross-doctor scheduling views are a later phase.
    return await controller.list_my_appointments(db, user)


@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    data: CreateAppointmentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_appointment(db, user, data)


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    appointment_id: UUID,
    data: RescheduleAppointmentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.reschedule_appointment(db, user, appointment_id, data)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: UUID,
    data: CancelAppointmentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.cancel_appointment(db, user, appointment_id, data)


@router.patch("/{appointment_id}/complete", response_model=AppointmentResponse)
async def complete_appointment(
    appointment_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.complete_appointment(db, user, appointment_id)
