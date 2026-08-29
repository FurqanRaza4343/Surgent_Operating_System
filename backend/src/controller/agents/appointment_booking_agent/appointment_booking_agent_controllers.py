from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.appointment import AppointmentResponse, CreateAppointmentRequest
from src.services.agents.appointment_booking_agent.appointment_booking_agent_services import AppointmentBookingService


class AppointmentBookingController:
    def __init__(self):
        self.service = AppointmentBookingService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)

    async def book(self, db: AsyncSession, user: User, data: CreateAppointmentRequest) -> AppointmentResponse:
        appointment = await self.service.book(
            db,
            user.practice_id,
            data.patient_id,
            data.doctor_id,
            data.appointment_type,
            data.start_time,
            data.end_time,
            data.notes,
        )
        return AppointmentResponse.model_validate(appointment)
