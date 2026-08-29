from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.appointment import AppointmentResponse, RescheduleAppointmentRequest, CancelAppointmentRequest
from src.services.agents.reschedule_cancellation_agent.reschedule_cancellation_agent_services import RescheduleCancellationService


class RescheduleCancellationController:
    def __init__(self):
        self.service = RescheduleCancellationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)

    async def reschedule(
        self, db: AsyncSession, user: User, appointment_id: UUID, data: RescheduleAppointmentRequest
    ) -> AppointmentResponse:
        appointment = await self.service.reschedule(db, user.practice_id, appointment_id, data.start_time, data.end_time)
        return AppointmentResponse.model_validate(appointment)

    async def cancel(
        self, db: AsyncSession, user: User, appointment_id: UUID, data: CancelAppointmentRequest
    ) -> AppointmentResponse:
        appointment = await self.service.cancel(db, user.practice_id, appointment_id, data.reason)
        return AppointmentResponse.model_validate(appointment)
