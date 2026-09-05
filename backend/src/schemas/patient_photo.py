from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class PatientPhotoResponse(BaseModel):
    id: UUID
    patient_id: UUID
    cloudinary_url: str
    photo_type: str | None
    notes: str | None
    stage: str | None = None
    body_area: str | None = None
    procedure_id: UUID | None = None
    is_marketing_approved: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdatePatientPhotoRequest(BaseModel):
    stage: str | None = None
    body_area: str | None = None
    procedure_id: UUID | None = None
    is_marketing_approved: bool | None = None
    notes: str | None = None
