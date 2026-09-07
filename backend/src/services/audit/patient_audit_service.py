from __future__ import annotations
from uuid import UUID

from sqlalchemy import select, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.audit_log import AuditLog
from src.models.patient_photo import PatientPhoto
from src.models.consent_document import ConsentDocument
from src.models.appointment import Appointment
from src.models.treatment_plan import TreatmentPlan
from src.models.consultation_note import ConsultationNote
from src.models.invoice import Invoice


class PatientAuditService:
    """Assembles one patient's Activity/Audit feed — AuditLog rows are
    written against whichever resource actually changed (a photo upload
    logs resource_type="patient_photo", not "patient"), so showing a real
    per-patient history means gathering every child resource's id first,
    not just filtering on resource_type="patient". Owner-only surface (see
    patients_router.py) — this is the one place staff can see "who did
    what to this record and when."""

    async def list_for_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID, limit: int = 100) -> list[AuditLog]:
        photo_ids = (await db.execute(select(PatientPhoto.id).where(PatientPhoto.patient_id == patient_id))).scalars().all()
        consent_ids = (await db.execute(select(ConsentDocument.id).where(ConsentDocument.patient_id == patient_id))).scalars().all()
        appointment_ids = (await db.execute(select(Appointment.id).where(Appointment.patient_id == patient_id))).scalars().all()
        plan_ids = (await db.execute(select(TreatmentPlan.id).where(TreatmentPlan.patient_id == patient_id))).scalars().all()
        note_ids = (await db.execute(select(ConsultationNote.id).where(ConsultationNote.patient_id == patient_id))).scalars().all()
        invoice_ids = (await db.execute(select(Invoice.id).where(Invoice.patient_id == patient_id))).scalars().all()

        def _clause(resource_type: str, ids: list[UUID]):
            return and_(AuditLog.resource_type == resource_type, AuditLog.resource_id.in_(ids)) if ids else None

        clauses = [and_(AuditLog.resource_type == "patient", AuditLog.resource_id == patient_id)]
        for resource_type, ids in (
            ("patient_photo", photo_ids), ("consent_document", consent_ids),
            ("appointment", appointment_ids), ("treatment_plan", plan_ids),
            ("consultation_note", note_ids), ("invoice", invoice_ids),
        ):
            clause = _clause(resource_type, ids)
            if clause is not None:
                clauses.append(clause)

        result = await db.execute(
            select(AuditLog)
            .options(selectinload(AuditLog.actor_user))
            .where(AuditLog.practice_id == practice_id, or_(*clauses))
            .order_by(desc(AuditLog.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())
