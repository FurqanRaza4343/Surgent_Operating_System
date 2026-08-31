from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateConsentDocumentRequest(BaseModel):
    document_type: str
    content: str | None = None


class SignConsentDocumentRequest(BaseModel):
    # Patient-typed full legal name, captured by staff while the patient is
    # physically present — see models/consent_document.py's own note on why
    # this signing model was chosen over a mailed e-sign link or a scanned
    # upload.
    signed_by_name: str


class VoidConsentDocumentRequest(BaseModel):
    reason: str | None = None


class ConsentDocumentResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    document_type: str
    content: str | None
    version: int
    status: str
    signed_at: datetime | None
    signed_by_name: str | None
    witnessed_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
