from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AppointmentCreate(BaseModel):
    patient_id: UUID
    appointment_type: str
    start_time: datetime
    end_time: datetime
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    provider_id: UUID | None
    appointment_type: str
    status: str
    start_time: datetime
    end_time: datetime
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
