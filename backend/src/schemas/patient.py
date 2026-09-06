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


# Shared by Update and the profile-depth section of Response — every field
# here is optional to fill in over time, not required at intake.
class PatientProfileFields(BaseModel):
    gender: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    allergies: list[dict] | None = None
    surgical_history: list[dict] | None = None
    current_medications: list[dict] | None = None
    smoking_status: str | None = None
    previous_cosmetic_procedures: list[dict] | None = None
    referral_source: str | None = None
    preferred_language: str | None = None
    communication_preferences: dict | None = None
    insurance_provider: str | None = None
    insurance_number: str | None = None


class UpdatePatientRequest(PatientProfileFields):
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
    # --- profile depth (Week 2) ---
    gender: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    allergies: list[dict] = []
    surgical_history: list[dict] = []
    current_medications: list[dict] = []
    smoking_status: str | None = None
    previous_cosmetic_procedures: list[dict] = []
    referral_source: str | None = None
    preferred_language: str | None = None
    communication_preferences: dict = {}
    insurance_provider: str | None = None
    insurance_number: str | None = None
    # --- AI workflows (Week 4) ---
    qualification: dict | None = None
    intake_summary: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
