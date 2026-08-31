from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.consent_document import ConsentDocument, ConsentDocumentStatus
from src.models.patient import Patient
from src.schemas.consent_document import CreateConsentDocumentRequest
from src.server.exceptions import NotFoundException, AppException


class ConsentService:
    """Real per-document consent, replacing Patient.consent_status as the
    only signal (kept as a denormalized flag, recomputed here whenever a
    document is signed or voided, so existing reads of it keep working).
    Administrative/legal, not clinical judgment — deliberately open to
    Owner/Doctor/Receptionist alike (front desk routinely collects consent
    at intake), unlike clinical notes."""

    async def _get_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> Patient:
        result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")
        return patient

    async def _recompute_consent_status(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> None:
        has_signed = await db.scalar(
            select(ConsentDocument.id)
            .where(
                ConsentDocument.practice_id == practice_id,
                ConsentDocument.patient_id == patient_id,
                ConsentDocument.status == ConsentDocumentStatus.SIGNED,
            )
            .limit(1)
        )
        patient = await self._get_patient(db, practice_id, patient_id)
        patient.consent_status = has_signed is not None
        await db.flush()

    async def create_document(
        self, db: AsyncSession, practice_id: UUID, patient_id: UUID, data: CreateConsentDocumentRequest
    ) -> ConsentDocument:
        await self._get_patient(db, practice_id, patient_id)
        document = ConsentDocument(
            practice_id=practice_id,
            patient_id=patient_id,
            document_type=data.document_type,
            content=data.content,
        )
        db.add(document)
        await db.flush()
        await db.refresh(document)
        return document

    async def list_for_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> list[ConsentDocument]:
        query = (
            select(ConsentDocument)
            .where(ConsentDocument.practice_id == practice_id, ConsentDocument.patient_id == patient_id)
            .order_by(ConsentDocument.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_document(self, db: AsyncSession, practice_id: UUID, document_id: UUID) -> ConsentDocument:
        query = select(ConsentDocument).where(ConsentDocument.id == document_id, ConsentDocument.practice_id == practice_id)
        result = await db.execute(query)
        document = result.scalar_one_or_none()
        if document is None:
            raise NotFoundException("Consent document not found")
        return document

    async def sign_document(
        self, db: AsyncSession, practice_id: UUID, document_id: UUID, signed_by_name: str, witnessed_by: UUID
    ) -> ConsentDocument:
        document = await self.get_document(db, practice_id, document_id)
        if document.status == ConsentDocumentStatus.SIGNED:
            raise AppException("This document is already signed.")
        if document.status == ConsentDocumentStatus.VOID:
            raise AppException("This document was voided — create a new one instead.")

        document.status = ConsentDocumentStatus.SIGNED
        document.signed_at = datetime.now(timezone.utc)
        document.signed_by_name = signed_by_name
        document.witnessed_by = witnessed_by
        await db.flush()
        await db.refresh(document)

        await self._recompute_consent_status(db, practice_id, document.patient_id)
        return document

    async def void_document(self, db: AsyncSession, practice_id: UUID, document_id: UUID) -> ConsentDocument:
        document = await self.get_document(db, practice_id, document_id)
        document.status = ConsentDocumentStatus.VOID
        await db.flush()
        await db.refresh(document)

        await self._recompute_consent_status(db, practice_id, document.patient_id)
        return document
