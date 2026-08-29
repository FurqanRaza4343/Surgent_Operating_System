from __future__ import annotations
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.appointment import Appointment
from src.services.appointments.appointments_services import AppointmentsService
from src.services.agent_log.agent_log_service import AgentLogService


class AppointmentBookingService:
    def __init__(self):
        self.appointments = AppointmentsService()
        self.agent_log = AgentLogService()

    async def get_status(self, user: dict) -> dict:
        return {"agent": "appointment_booking", "status": "active", "user": user.get("sub")}

    async def book(
        self,
        db: AsyncSession,
        practice_id: UUID,
        patient_id: UUID,
        doctor_id: UUID | None,
        appointment_type: str,
        start_time: datetime,
        end_time: datetime,
        notes: str | None = None,
    ) -> Appointment:
        appointment = await self.appointments.create_appointment(
            db, practice_id, patient_id, doctor_id, appointment_type, start_time, end_time, notes
        )
        await self.agent_log.log(
            db,
            practice_id,
            agent_type="appointment_booking",
            action="appointment_booked",
            details={"appointment_id": str(appointment.id), "patient_id": str(patient_id)},
            performed_by="ai_agent",
        )
        return appointment
