from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateDoctorRequest(BaseModel):
    name: str
    email: str
    phone: str | None = None
    specialty: str | None = None
    license_number: str | None = None
    bio: str | None = None
    capabilities: list[str] = []


class UpdateDoctorRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    specialty: str | None = None
    license_number: str | None = None
    bio: str | None = None
    capabilities: list[str] | None = None
    is_active: bool | None = None


class DoctorResponse(BaseModel):
    id: UUID
    practice_id: UUID
    user_id: UUID | None
    name: str
    email: str
    phone: str | None
    specialty: str | None
    license_number: str | None
    bio: str | None
    photo_url: str | None
    capabilities: list[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
