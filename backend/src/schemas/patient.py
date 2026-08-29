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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
