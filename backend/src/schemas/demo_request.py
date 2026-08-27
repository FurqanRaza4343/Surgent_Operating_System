from __future__ import annotations
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class DemoRequestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    practice_name: str | None = None
    message: str | None = None


class DemoRequestResponse(BaseModel):
    id: UUID
    name: str
    email: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
