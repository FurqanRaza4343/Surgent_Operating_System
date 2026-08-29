from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_user, get_current_practice_user
from src.models.user import User
from src.schemas.appointment import AppointmentResponse, RescheduleAppointmentRequest, CancelAppointmentRequest
from src.controller.agents.reschedule_cancellation_agent.reschedule_cancellation_agent_controllers import RescheduleCancellationController

router = APIRouter(prefix="/agents/reschedule_cancellation", tags=["Reschedule Cancellation"])
controller = RescheduleCancellationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    appointment_id: UUID,
    data: RescheduleAppointmentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.reschedule(db, user, appointment_id, data)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: UUID,
    data: CancelAppointmentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.cancel(db, user, appointment_id, data)
