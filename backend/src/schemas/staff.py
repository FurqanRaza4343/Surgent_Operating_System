from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class InviteStaffRequest(BaseModel):
    email: str
    permissions: list[str] = []


class InviteStaffResponse(BaseModel):
    email: str
    permissions: list[str]


class UpdateStaffRequest(BaseModel):
    permissions: list[str] | None = None
    is_active: bool | None = None


class StaffResponse(BaseModel):
    id: UUID
    practice_id: UUID
    email: str
    name: str | None
    role: str
    permissions: list[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
