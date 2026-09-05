from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class WaitlistEntryResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID | None
    patient_name: str
    phone: str | None
    doctor_id: UUID | None
    doctor_name: str | None = None
    requested_date: date | None
    notes: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateWaitlistEntryRequest(BaseModel):
    patient_id: UUID | None = None
    patient_name: str
    phone: str | None = None
    doctor_id: UUID | None = None
    requested_date: date | None = None
    notes: str | None = None
