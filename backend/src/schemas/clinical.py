from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


# --- Consultation Notes (SOAP-structured) -----------------------------------

class CreateConsultationNoteRequest(BaseModel):
    patient_id: UUID
    appointment_id: UUID | None = None
    chief_complaint: str | None = None
    subjective: str | None = None
    objective: str | None = None
    assessment: str | None = None
    plan: str | None = None
    status: str = "draft"


class UpdateConsultationNoteRequest(BaseModel):
    chief_complaint: str | None = None
    subjective: str | None = None
    objective: str | None = None
    assessment: str | None = None
    plan: str | None = None
    status: str | None = None


class AIConsultationDraftRequest(BaseModel):
    patient_id: UUID
    raw_notes: str


class AIConsultationDraftResponse(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str
    follow_up_tasks: list[str] = []


class ConsultationNoteResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_id: UUID | None
    chief_complaint: str | None
    subjective: str | None
    objective: str | None
    assessment: str | None
    plan: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Treatment Plans ----------------------------------------------------------

class CreateTreatmentPlanItemRequest(BaseModel):
    procedure_id: UUID
    phase_order: int = 0
    estimated_price: float | None = None
    notes: str | None = None


class CreateTreatmentPlanRequest(BaseModel):
    patient_id: UUID
    consultation_note_id: UUID | None = None
    title: str
    items: list[CreateTreatmentPlanItemRequest] = []


class UpdateTreatmentPlanRequest(BaseModel):
    title: str | None = None
    status: str | None = None


class UpdateTreatmentPlanItemRequest(BaseModel):
    status: str | None = None
    estimated_price: float | None = None
    actual_price: float | None = None
    scheduled_appointment_id: UUID | None = None
    notes: str | None = None


class TreatmentPlanItemResponse(BaseModel):
    id: UUID
    treatment_plan_id: UUID
    procedure_id: UUID
    phase_order: int
    estimated_price: float | None
    status: str
    scheduled_appointment_id: UUID | None
    performed_at: datetime | None
    actual_price: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TreatmentPlanResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    doctor_id: UUID
    consultation_note_id: UUID | None
    title: str
    status: str
    items: list[TreatmentPlanItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
