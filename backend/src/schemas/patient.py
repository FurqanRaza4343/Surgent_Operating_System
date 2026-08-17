from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    medical_history: dict = {}


class PatientResponse(BaseModel):
    id: UUID
    practice_id: UUID
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    date_of_birth: date | None
    medical_history: dict
    consent_status: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
