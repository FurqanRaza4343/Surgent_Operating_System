from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateProcedureRequest(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    base_price: float | None = None
    duration_minutes: int | None = None


class UpdateProcedureRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    base_price: float | None = None
    duration_minutes: int | None = None
    is_active: bool | None = None


class ProcedureResponse(BaseModel):
    id: UUID
    practice_id: UUID
    name: str
    category: str | None
    description: str | None
    base_price: float | None
    duration_minutes: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
