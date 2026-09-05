from __future__ import annotations
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.doctor import Doctor
from src.models.appointment import Appointment, AppointmentStatus
from src.models.patient import Patient
from src.models.consultation_note import ConsultationNote, ConsultationNoteStatus
from src.models.consent_document import ConsentDocument, ConsentDocumentStatus
from src.server.exceptions import NotFoundException

# A note or consent sitting untouched this long shows up in the alerts
# panel — short enough to be genuinely useful day-to-day, not a compliance
# threshold.
_STALE_AFTER = timedelta(days=2)


class DoctorDashboardService:
    """Backs the Doctor's "today at a glance" widgets — waiting room,
    pending paperwork, and a simple alerts panel. Every query is scoped to
    the caller's own linked Doctor row; there is no cross-doctor view here
    (that's Front Desk's job)."""

    async def _resolve_doctor(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> Doctor:
        result = await db.execute(select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("No doctor profile linked to this account")
        return doctor

    async def get_today_snapshot(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> dict:
        doctor = await self._resolve_doctor(db, practice_id, user_id)
        now = datetime.now(timezone.utc)

        waiting_result = await db.execute(
            select(Appointment, Patient)
            .join(Patient, Patient.id == Appointment.patient_id)
            .where(
                Appointment.practice_id == practice_id,
                Appointment.doctor_id == doctor.id,
                Appointment.status.in_([AppointmentStatus.CHECKED_IN, AppointmentStatus.WITH_DOCTOR]),
            )
            .order_by(Appointment.checked_in_at.asc())
        )
        waiting_room = [
            {
                "appointment_id": appt.id,
                "patient_id": patient.id,
                "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
                "appointment_type": appt.appointment_type,
                "status": appt.status.value,
                "checked_in_at": appt.checked_in_at,
                "with_doctor_at": appt.with_doctor_at,
            }
            for appt, patient in waiting_result.all()
        ]

        notes_result = await db.execute(
            select(ConsultationNote, Patient)
            .join(Patient, Patient.id == ConsultationNote.patient_id)
            .where(
                ConsultationNote.practice_id == practice_id,
                ConsultationNote.doctor_id == doctor.id,
                ConsultationNote.status == ConsultationNoteStatus.DRAFT,
            )
            .order_by(ConsultationNote.created_at.asc())
        )
        note_rows = notes_result.all()
        pending_notes = [
            {
                "note_id": note.id,
                "patient_id": patient.id,
                "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
                "appointment_id": note.appointment_id,
                "created_at": note.created_at,
            }
            for note, patient in note_rows
        ]

        # "My patients" for consent purposes = anyone with an appointment
        # under this doctor — a Doctor has no formal patient roster.
        my_patient_ids_result = await db.execute(
            select(Appointment.patient_id).where(
                Appointment.practice_id == practice_id, Appointment.doctor_id == doctor.id
            ).distinct()
        )
        my_patient_ids = [row[0] for row in my_patient_ids_result.all()]

        pending_consent_count = 0
        stale_consents: list[tuple[ConsentDocument, Patient]] = []
        if my_patient_ids:
            consents_result = await db.execute(
                select(ConsentDocument, Patient)
                .join(Patient, Patient.id == ConsentDocument.patient_id)
                .where(
                    ConsentDocument.practice_id == practice_id,
                    ConsentDocument.patient_id.in_(my_patient_ids),
                    ConsentDocument.status.in_([ConsentDocumentStatus.DRAFT, ConsentDocumentStatus.SENT]),
                )
            )
            consent_rows = consents_result.all()
            pending_consent_count = len(consent_rows)
            stale_consents = [(c, p) for c, p in consent_rows if now - c.created_at > _STALE_AFTER]

        alerts = []
        for note, patient in note_rows:
            if now - note.created_at > _STALE_AFTER:
                alerts.append({
                    "type": "overdue_note",
                    "patient_id": patient.id,
                    "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
                    "message": "Consultation note still in draft",
                    "since": note.created_at,
                })
        for consent, patient in stale_consents:
            # document_type is free text and often already ends in "consent"
            # (e.g. "Photo release consent") — appending it again read as a
            # copy-paste bug ("...consent consent still unsigned").
            label = consent.document_type if consent.document_type.lower().endswith("consent") else f"{consent.document_type} consent"
            alerts.append({
                "type": "unsigned_consent",
                "patient_id": patient.id,
                "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
                "message": f"{label} still unsigned",
                "since": consent.created_at,
            })
        alerts.sort(key=lambda a: a["since"])

        return {
            "waiting_room": waiting_room,
            "pending_notes": pending_notes,
            "pending_consent_count": pending_consent_count,
            "alerts": alerts,
        }
