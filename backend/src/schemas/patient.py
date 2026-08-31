from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class CreatePatientRequest(BaseModel):
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    chief_complaint: str | None = None
    needs_surgery: bool = False
    # Set by the frontend's classifyPatient() before the request is sent —
    # the backend stores whatever it's told rather than re-deriving it, since
    # the classification logic lives client-side (dashboard/patients/classifyPatient.ts).
    ai_agent_assigned: str | None = None
    source: str | None = None


class UpdatePatientRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    chief_complaint: str | None = None
    needs_surgery: bool | None = None
    source: str | None = None


class UpdatePatientStageRequest(BaseModel):
    stage: str
    lost_reason: str | None = None


class FunnelStageCount(BaseModel):
    stage: str
    count: int


class PatientResponse(BaseModel):
    id: UUID
    practice_id: UUID
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    date_of_birth: date | None
    chief_complaint: str | None
    needs_surgery: bool
    consent_status: bool
    ai_agent_assigned: str | None
    agent_status: str
    lifecycle_stage: str
    lost_reason: str | None
    source: str | None
    # Derived from real Appointment rows (see patients_services.py's
    # _attach_appointment_flags) rather than a stored lifecycle status — lets
    # the frontend stop hardcoding every patient as a "lead". Default False
    # covers a freshly created patient with no appointments yet.
    has_upcoming_appointment: bool = False
    has_completed_appointment: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
