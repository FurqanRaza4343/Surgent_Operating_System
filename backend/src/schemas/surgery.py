from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateSurgeryRequest(BaseModel):
    patient_id: UUID
    procedure_id: UUID | None = None
    doctor_id: UUID
    assistant_doctor_id: UUID | None = None
    scheduled_appointment_id: UUID | None = None
    scheduled_date: datetime
    duration_estimate_minutes: int | None = None
    anesthesia_type: str | None = None
    facility_note: str | None = None
    pre_op_checklist: list[dict] = []


class UpdateSurgeryRequest(BaseModel):
    scheduled_date: datetime | None = None
    duration_estimate_minutes: int | None = None
    anesthesia_type: str | None = None
    facility_note: str | None = None
    assistant_doctor_id: UUID | None = None
    pre_op_checklist: list[dict] | None = None
    implants_used: list[dict] | None = None
    operative_note: str | None = None


class CompleteSurgeryRequest(BaseModel):
    operative_note: str
    implants_used: list[dict] = []


class SurgeryResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    patient_name: str | None = None
    procedure_id: UUID | None
    procedure_name: str | None = None
    doctor_id: UUID
    doctor_name: str | None = None
    assistant_doctor_id: UUID | None
    assistant_doctor_name: str | None = None
    scheduled_appointment_id: UUID | None
    recovery_journal_id: UUID | None
    scheduled_date: datetime
    duration_estimate_minutes: int | None
    anesthesia_type: str | None
    facility_note: str | None
    pre_op_checklist: list[dict]
    implants_used: list[dict]
    operative_note: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
