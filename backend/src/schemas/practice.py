from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class PracticeCreate(BaseModel):
    name: str
    email: str
    phone: str | None = None
    address: str | None = None
    timezone: str = "UTC"


class PracticeResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: str | None
    address: str | None
    timezone: str
    settings: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
