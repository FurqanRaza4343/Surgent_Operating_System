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
