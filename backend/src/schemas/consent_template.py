from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateConsentTemplateRequest(BaseModel):
    document_type: str
    body: str


class UpdateConsentTemplateRequest(BaseModel):
    # Editing the body bumps `version` server-side — see
    # services/consent/consent_template_services.py. is_active lets the
    # Owner retire a template without deleting its history (past
    # ConsentDocuments still reference it by id).
    body: str | None = None
    is_active: bool | None = None


class ConsentTemplateResponse(BaseModel):
    id: UUID
    practice_id: UUID
    document_type: str
    version: int
    body: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
