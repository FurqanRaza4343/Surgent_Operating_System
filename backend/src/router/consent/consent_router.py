from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.consent_document import (
    CreateConsentDocumentRequest,
    SignConsentDocumentRequest,
    ConsentDocumentResponse,
)
from src.controller.consent.consent_controllers import ConsentController

router = APIRouter(tags=["Consent Documents"])
controller = ConsentController()

# Administrative/legal, not clinical judgment — open to any active practice
# member (front desk routinely collects consent at intake), unlike
# clinical.py's Owner/Doctor-only notes.


@router.post("/patients/{patient_id}/consent-documents", response_model=ConsentDocumentResponse)
async def create_consent_document(
    patient_id: UUID,
    data: CreateConsentDocumentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_document(db, user, patient_id, data)


@router.get("/patients/{patient_id}/consent-documents", response_model=list[ConsentDocumentResponse])
async def list_consent_documents(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_for_patient(db, user, patient_id)


@router.post("/consent-documents/{document_id}/sign", response_model=ConsentDocumentResponse)
async def sign_consent_document(
    document_id: UUID,
    data: SignConsentDocumentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.sign_document(db, user, document_id, data.signed_by_name)


@router.post("/consent-documents/{document_id}/void", response_model=ConsentDocumentResponse)
async def void_consent_document(
    document_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.void_document(db, user, document_id)
