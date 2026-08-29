from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.services.appointments.appointments_services import AppointmentsService
from src.services.messaging.messaging_service import MessagingService
from src.services.agent_log.agent_log_service import AgentLogService
from src.server.exceptions import NotFoundException


class AppointmentReminderService:
    def __init__(self):
        self.appointments = AppointmentsService()
        self.messaging = MessagingService()
        self.agent_log = AgentLogService()

    async def get_status(self, user: dict) -> dict:
        return {"agent": "appointment_reminder", "status": "active", "user": user.get("sub")}

    async def send_reminder(self, db: AsyncSession, practice_id: UUID, appointment_id: UUID) -> dict:
        appointment = await self.appointments.get_appointment(db, practice_id, appointment_id)

        result = await db.execute(select(Patient).where(Patient.id == appointment.patient_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found for this appointment")

        when = appointment.start_time.strftime("%A, %B %d at %I:%M %p")
        text = f"Hi {patient.first_name}, this is a reminder for your {appointment.appointment_type} appointment on {when}. Reply if you need to reschedule."

        message = await self.messaging.send_and_log(db, practice_id, patient, "appointment_reminder", text)
        await self.agent_log.log(
            db,
            practice_id,
            agent_type="appointment_reminder",
            action="reminder_sent",
            details={"appointment_id": str(appointment.id), "patient_id": str(patient.id)},
            performed_by="ai_agent",
        )
        return {"appointment_id": str(appointment.id), "message_id": str(message.id), "sent": True}
