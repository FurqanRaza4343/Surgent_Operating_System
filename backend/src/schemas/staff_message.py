from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateStaffMessageRequest(BaseModel):
    body: str


class StaffMessageResponse(BaseModel):
    id: UUID
    practice_id: UUID
    staff_user_id: UUID
    sender_id: UUID
    sender_name: str | None
    sender_role: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StaffMessageThreadSummary(BaseModel):
    staff_user_id: UUID
    staff_name: str | None
    staff_role: str
    last_message_preview: str | None
    last_message_at: datetime | None
    message_count: int
