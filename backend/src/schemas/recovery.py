from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime


class RecoveryCheckInResponse(BaseModel):
    id: UUID
    recovery_journal_id: UUID
    checkpoint: str
    pain_score: int | None
    swelling_level: str | None
    temperature_celsius: float | None
    symptoms: list
    concerns: str | None
    photo_url: str | None
    flagged_for_review: bool
    flag_reason: str | None
    reviewed_by_user_id: UUID | None
    reviewed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RecoveryJournalResponse(BaseModel):
    id: UUID
    patient_id: UUID
    procedure_id: UUID | None
    surgery_date: date | None
    recovery_day: int
    healing_score: int | None
    medication_adherence: int | None
    checkin_completion: int | None
    status: str
    checkins: list[RecoveryCheckInResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmitCheckInRequest(BaseModel):
    checkpoint: str
    pain_score: int | None = None
    swelling_level: str | None = None
    temperature_celsius: float | None = None
    symptoms: list[str] = []
    concerns: str | None = None
    photo_url: str | None = None


class FlaggedCheckInResponse(BaseModel):
    checkin: RecoveryCheckInResponse
    patient_id: UUID
    patient_name: str
