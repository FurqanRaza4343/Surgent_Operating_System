from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class UserResponse(BaseModel):
    id: UUID
    clerk_id: str
    email: str
    name: str | None
    role: str
    practice_id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ClerkWebhookEvent(BaseModel):
    type: str
    data: dict
