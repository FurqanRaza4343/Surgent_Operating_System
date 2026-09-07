from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.consent_document import CreateConsentDocumentRequest, ConsentDocumentResponse
from src.server.patient_access import verify_doctor_access
from src.services.consent.consent_services import ConsentService
from src.services.audit.audit_log_service import AuditLogService


class ConsentController:
    def __init__(self):
        self.service = ConsentService()
        self.audit = AuditLogService()

    async def create_document(self, db: AsyncSession, user: User, patient_id: UUID, data: CreateConsentDocumentRequest) -> ConsentDocumentResponse:
        document = await self.service.create_document(db, user.practice_id, patient_id, data)
        return ConsentDocumentResponse.model_validate(document)

    async def list_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[ConsentDocumentResponse]:
        await verify_doctor_access(db, user, patient_id)
        documents = await self.service.list_for_patient(db, user.practice_id, patient_id)
        return [ConsentDocumentResponse.model_validate(d) for d in documents]

    async def sign_document(self, db: AsyncSession, user: User, document_id: UUID, signed_by_name: str) -> ConsentDocumentResponse:
        document = await self.service.sign_document(db, user.practice_id, document_id, signed_by_name, user.id)
        return ConsentDocumentResponse.model_validate(document)

    async def void_document(self, db: AsyncSession, user: User, document_id: UUID) -> ConsentDocumentResponse:
        document = await self.service.void_document(db, user.practice_id, document_id)
        return ConsentDocumentResponse.model_validate(document)

    async def mark_discussed(self, db: AsyncSession, user: User, document_id: UUID) -> ConsentDocumentResponse:
        document = await self.service.get_document(db, user.practice_id, document_id)
        await verify_doctor_access(db, user, document.patient_id)
        document = await self.service.mark_discussed(db, user.practice_id, document_id, user.id)
        await self.audit.log(
            db, user.practice_id, "user", "consent.discussed", actor_user_id=user.id,
            resource_type="consent_document", resource_id=document.id,
        )
        await db.commit()
        return ConsentDocumentResponse.model_validate(document)
