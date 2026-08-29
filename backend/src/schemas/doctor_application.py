from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class DocumentEntry(BaseModel):
    name: str
    url: str
    uploaded_at: str


class SubmitDoctorApplicationRequest(BaseModel):
    name: str
    email: str
    phone: str | None = None
    specialty: str | None = None
    license_number: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    documents: list[DocumentEntry] = []


class DoctorApplicationResponse(BaseModel):
    id: UUID
    practice_id: UUID
    name: str
    email: str
    phone: str | None
    specialty: str | None
    license_number: str | None
    bio: str | None
    photo_url: str | None
    documents: list[DocumentEntry]
    status: str
    rejected_reason: str | None
    doctor_id: UUID | None
    submitted_at: datetime
    reviewed_at: datetime | None

    model_config = {"from_attributes": True}


class ApproveDoctorApplicationRequest(BaseModel):
    permissions: list[str] = []


class RejectDoctorApplicationRequest(BaseModel):
    reason: str | None = None


class UploadResponse(BaseModel):
    url: str
    name: str
