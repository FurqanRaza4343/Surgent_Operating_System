from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.consent_document import CreateConsentDocumentRequest, ConsentDocumentResponse
from src.services.consent.consent_services import ConsentService


class ConsentController:
    def __init__(self):
        self.service = ConsentService()

    async def create_document(self, db: AsyncSession, user: User, patient_id: UUID, data: CreateConsentDocumentRequest) -> ConsentDocumentResponse:
        document = await self.service.create_document(db, user.practice_id, patient_id, data)
        return ConsentDocumentResponse.model_validate(document)

    async def list_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[ConsentDocumentResponse]:
        documents = await self.service.list_for_patient(db, user.practice_id, patient_id)
        return [ConsentDocumentResponse.model_validate(d) for d in documents]

    async def sign_document(self, db: AsyncSession, user: User, document_id: UUID, signed_by_name: str) -> ConsentDocumentResponse:
        document = await self.service.sign_document(db, user.practice_id, document_id, signed_by_name, user.id)
        return ConsentDocumentResponse.model_validate(document)

    async def void_document(self, db: AsyncSession, user: User, document_id: UUID) -> ConsentDocumentResponse:
        document = await self.service.void_document(db, user.practice_id, document_id)
        return ConsentDocumentResponse.model_validate(document)
