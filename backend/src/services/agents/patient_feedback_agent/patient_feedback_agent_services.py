from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.models.practice import Practice
from src.models.appointment import AppointmentStatus
from src.models.review_request import ReviewRequest
from src.services.appointments.appointments_services import AppointmentsService
from src.services.messaging.messaging_service import MessagingService
from src.services.agent_log.agent_log_service import AgentLogService
from src.server.exceptions import NotFoundException, AppException


class PatientFeedbackService:
    def __init__(self):
        self.appointments = AppointmentsService()
        self.messaging = MessagingService()
        self.agent_log = AgentLogService()

    async def get_status(self, user: dict) -> dict:
        return {"agent": "patient_feedback", "status": "active", "user": user.get("sub")}

    async def request_review(self, db: AsyncSession, practice_id: UUID, appointment_id: UUID) -> ReviewRequest:
        appointment = await self.appointments.get_appointment(db, practice_id, appointment_id)
        if appointment.status != AppointmentStatus.COMPLETED:
            raise AppException("Can only request a review for a completed appointment")

        result = await db.execute(select(Patient).where(Patient.id == appointment.patient_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found for this appointment")

        result = await db.execute(select(Practice).where(Practice.id == practice_id))
        practice = result.scalar_one_or_none()
        # Only include a real link if the practice has actually configured
        # one (Practice.settings JSONB) — never invent a review URL.
        review_link = (practice.settings or {}).get("review_link") if practice else None

        text = f"Hi {patient.first_name}, thank you for choosing us for your {appointment.appointment_type}. We'd love to hear how it went"
        text += f" — {review_link}" if review_link else ". Just reply to this message with your feedback."

        channel = await self.messaging.resolve_channel(db, practice_id, patient)
        await self.messaging.send_and_log(db, practice_id, patient, "patient_feedback", text)

        review_request = ReviewRequest(
            practice_id=practice_id,
            patient_id=patient.id,
            appointment_id=appointment.id,
            channel=channel,
        )
        db.add(review_request)
        await db.flush()
        await db.refresh(review_request)

        await self.agent_log.log(
            db,
            practice_id,
            agent_type="patient_feedback",
            action="review_requested",
            details={"appointment_id": str(appointment.id), "patient_id": str(patient.id)},
            performed_by="ai_agent",
        )
        return review_request
