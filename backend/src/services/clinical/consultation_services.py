from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.consultation_note import ConsultationNote, ConsultationNoteStatus
from src.models.doctor import Doctor
from src.models.patient import Patient
from src.schemas.clinical import CreateConsultationNoteRequest, UpdateConsultationNoteRequest
from src.server.exceptions import NotFoundException, AppException


class ConsultationService:
    """Backs the Doctor's clinical documentation workflow — SOAP-structured
    notes (Subjective/Objective/Assessment/Plan) tied to a patient and
    optionally the appointment they were written during. Every method is
    practice-scoped; callers always pass the requesting user's own
    practice_id."""

    async def _resolve_doctor(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> Doctor:
        result = await db.execute(select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("No doctor profile linked to this account")
        return doctor

    async def create_note(
        self, db: AsyncSession, practice_id: UUID, user_id: UUID, data: CreateConsultationNoteRequest
    ) -> ConsultationNote:
        doctor = await self._resolve_doctor(db, practice_id, user_id)

        patient_result = await db.execute(
            select(Patient).where(Patient.id == data.patient_id, Patient.practice_id == practice_id)
        )
        if patient_result.scalar_one_or_none() is None:
            raise NotFoundException("Patient not found")

        note = ConsultationNote(
            practice_id=practice_id,
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            appointment_id=data.appointment_id,
            chief_complaint=data.chief_complaint,
            subjective=data.subjective,
            objective=data.objective,
            assessment=data.assessment,
            plan=data.plan,
            status=ConsultationNoteStatus(data.status),
        )
        db.add(note)
        await db.flush()
        await db.refresh(note)
        return note

    async def list_for_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> list[ConsultationNote]:
        query = (
            select(ConsultationNote)
            .where(ConsultationNote.practice_id == practice_id, ConsultationNote.patient_id == patient_id)
            .order_by(ConsultationNote.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_note(self, db: AsyncSession, practice_id: UUID, note_id: UUID) -> ConsultationNote:
        query = select(ConsultationNote).where(ConsultationNote.id == note_id, ConsultationNote.practice_id == practice_id)
        result = await db.execute(query)
        note = result.scalar_one_or_none()
        if note is None:
            raise NotFoundException("Consultation note not found")
        return note

    async def update_note(
        self, db: AsyncSession, practice_id: UUID, note_id: UUID, data: UpdateConsultationNoteRequest
    ) -> ConsultationNote:
        note = await self.get_note(db, practice_id, note_id)
        if note.status == ConsultationNoteStatus.FINAL:
            raise AppException("This note has been finalized — create a new note instead of editing it.")

        fields = data.model_dump(exclude_unset=True)
        if "status" in fields:
            fields["status"] = ConsultationNoteStatus(fields["status"])
        for field, value in fields.items():
            setattr(note, field, value)
        await db.flush()
        await db.refresh(note)
        return note
