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
from src.schemas.consent_template import (
    CreateConsentTemplateRequest,
    UpdateConsentTemplateRequest,
    ConsentTemplateResponse,
)
from src.controller.consent.consent_controllers import ConsentController
from src.controller.consent.consent_template_controllers import ConsentTemplateController

router = APIRouter(tags=["Consent Documents"])
controller = ConsentController()
template_controller = ConsentTemplateController()

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


# --- Consent templates -------------------------------------------------
# The editable wording behind each consent type — see
# models/consent_document.py's ConsentTemplate docstring. Same open-to-any-
# staff-role reasoning as the documents above.


@router.post("/consent-templates", response_model=ConsentTemplateResponse)
async def create_consent_template(
    data: CreateConsentTemplateRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await template_controller.create_template(db, user, data)


@router.get("/consent-templates", response_model=list[ConsentTemplateResponse])
async def list_consent_templates(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await template_controller.list_templates(db, user)


@router.patch("/consent-templates/{template_id}", response_model=ConsentTemplateResponse)
async def update_consent_template(
    template_id: UUID,
    data: UpdateConsentTemplateRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await template_controller.update_template(db, user, template_id, data)
