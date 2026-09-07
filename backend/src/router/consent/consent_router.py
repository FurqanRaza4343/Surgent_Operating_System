from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user, require_role
from src.server.audit import audit_log_only
from src.models.user import User, UserRole
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

# Administrative/legal workflow (create/send/sign/void/templates) is Owner+
# Receptionist territory — front desk runs consent collection day to day.
# Doctor gets read access (their assigned patients only, enforced in the
# controller) plus one clinical action: mark_discussed. This mirrors
# billing_router.py's own _VIEW_ROLES/_MANAGE_ROLES split.
_MANAGE_ROLES = (UserRole.OWNER, UserRole.RECEPTIONIST)
_VIEW_ROLES = (UserRole.OWNER, UserRole.DOCTOR, UserRole.RECEPTIONIST)


@router.post("/patients/{patient_id}/consent-documents", response_model=ConsentDocumentResponse)
async def create_consent_document(
    patient_id: UUID,
    data: CreateConsentDocumentRequest,
    user: User = Depends(require_role(*_MANAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_document(db, user, patient_id, data)


@router.get("/patients/{patient_id}/consent-documents", response_model=list[ConsentDocumentResponse])
async def list_consent_documents(
    patient_id: UUID,
    user: User = Depends(require_role(*_VIEW_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_for_patient(db, user, patient_id)


@router.post("/consent-documents/{document_id}/sign", response_model=ConsentDocumentResponse)
async def sign_consent_document(
    document_id: UUID,
    data: SignConsentDocumentRequest,
    user: User = Depends(require_role(*_MANAGE_ROLES)),
    _audit: None = Depends(audit_log_only("consent.sign", "consent_document", id_param="document_id")),
    db: AsyncSession = Depends(get_db),
):
    return await controller.sign_document(db, user, document_id, data.signed_by_name)


@router.post("/consent-documents/{document_id}/void", response_model=ConsentDocumentResponse)
async def void_consent_document(
    document_id: UUID,
    user: User = Depends(require_role(*_MANAGE_ROLES)),
    _audit: None = Depends(audit_log_only("consent.void", "consent_document", id_param="document_id")),
    db: AsyncSession = Depends(get_db),
):
    return await controller.void_document(db, user, document_id)


@router.post("/consent-documents/{document_id}/mark-discussed", response_model=ConsentDocumentResponse)
async def mark_consent_discussed(
    document_id: UUID,
    user: User = Depends(require_role(UserRole.OWNER, UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db),
):
    """Doctor's one consent action — a lightweight "discussed this with the
    patient" note. Doctor is restricted to their own assigned patients
    (enforced in the controller); the actual send/sign/void workflow stays
    Owner/Receptionist-only above."""
    return await controller.mark_discussed(db, user, document_id)


# --- Consent templates -------------------------------------------------
# The editable wording behind each consent type — see
# models/consent_document.py's ConsentTemplate docstring. Owner/Receptionist
# manage; Doctor doesn't need template administration to do their one
# consent action above.


@router.post("/consent-templates", response_model=ConsentTemplateResponse)
async def create_consent_template(
    data: CreateConsentTemplateRequest,
    user: User = Depends(require_role(*_MANAGE_ROLES)),
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
    user: User = Depends(require_role(*_MANAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await template_controller.update_template(db, user, template_id, data)
