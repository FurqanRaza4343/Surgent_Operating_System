from __future__ import annotations
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.appointment import Appointment
from src.services.appointments.appointments_services import AppointmentsService
from src.services.agent_log.agent_log_service import AgentLogService


class RescheduleCancellationService:
    def __init__(self):
        self.appointments = AppointmentsService()
        self.agent_log = AgentLogService()

    async def get_status(self, user: dict) -> dict:
        return {"agent": "reschedule_cancellation", "status": "active", "user": user.get("sub")}

    async def reschedule(
        self, db: AsyncSession, practice_id: UUID, appointment_id: UUID, new_start_time: datetime, new_end_time: datetime
    ) -> Appointment:
        appointment = await self.appointments.reschedule_appointment(
            db, practice_id, appointment_id, new_start_time, new_end_time
        )
        await self.agent_log.log(
            db,
            practice_id,
            agent_type="reschedule_cancellation",
            action="appointment_rescheduled",
            details={"appointment_id": str(appointment.id)},
            performed_by="ai_agent",
        )
        return appointment

    async def cancel(
        self, db: AsyncSession, practice_id: UUID, appointment_id: UUID, reason: str | None = None
    ) -> Appointment:
        appointment = await self.appointments.cancel_appointment(db, practice_id, appointment_id, reason)
        await self.agent_log.log(
            db,
            practice_id,
            agent_type="reschedule_cancellation",
            action="appointment_cancelled",
            details={"appointment_id": str(appointment.id), "reason": reason},
            performed_by="ai_agent",
        )
        return appointment
