from __future__ import annotations
from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PracticeMeResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: str
    plan_tier: str
    subscription_status: str
    role: str
    # Only meaningful when role == "doctor" or "receptionist" — the granted
    # permission keys from data/doctor_permissions.py (models/doctor.py's
    # `permissions` column) or data/receptionist_permissions.py
    # (models/user.py's `permissions` column) respectively. Empty for Owner.
    permissions: list[str] = []


class UpdatePracticeRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None


class ClaimPlanRequest(BaseModel):
    session_id: str


class ClaimPlanResponse(BaseModel):
    practice_id: UUID
    plan_tier: str


class DoctorSignupCodeResponse(BaseModel):
    code: str
    signup_url: str


class ValidateDoctorCodeResponse(BaseModel):
    valid: bool
    practice_id: Optional[UUID] = None
    practice_name: Optional[str] = None
