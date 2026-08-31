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
    created_at: datetime

    model_config = {"from_attributes": True}
