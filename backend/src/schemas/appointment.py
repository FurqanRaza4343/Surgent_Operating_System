from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AppointmentResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    doctor_id: UUID | None
    appointment_type: str
    status: str
    start_time: datetime
    end_time: datetime
    checked_in_at: datetime | None = None
    with_doctor_at: datetime | None = None
    ready_for_checkout_at: datetime | None = None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    patient_name: str | None = None

    model_config = {"from_attributes": True}


class CreateAppointmentRequest(BaseModel):
    patient_id: UUID
    doctor_id: UUID | None = None
    appointment_type: str
    start_time: datetime
    end_time: datetime
    notes: str | None = None


class RescheduleAppointmentRequest(BaseModel):
    start_time: datetime
    end_time: datetime


class CancelAppointmentRequest(BaseModel):
    reason: str | None = None
