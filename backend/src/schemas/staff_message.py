from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateStaffMessageRequest(BaseModel):
    body: str


class StartConversationRequest(BaseModel):
    recipient_user_id: UUID
    body: str | None = None


class StaffMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender_name: str | None
    sender_role: str
    body: str
    created_at: datetime
    mine: bool

    model_config = {"from_attributes": True}


class StaffContactResponse(BaseModel):
    id: UUID
    name: str | None
    role: str
    email: str


class StaffConversationResponse(BaseModel):
    conversation_id: UUID
    recipient_id: UUID
    recipient_name: str | None
    recipient_role: str
    last_message_preview: str | None
    last_message_at: datetime | None
    message_count: int