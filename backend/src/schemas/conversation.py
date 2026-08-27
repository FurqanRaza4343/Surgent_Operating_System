from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    content_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID | None
    agent_type: str
    channel: str
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    """Shape for GET /conversations — matches the frontend dashboard's
    `Session` type (frontend/src/app/dashboard/sessions/types.ts) so that
    page's mock data can be swapped for a real fetch without a UI rewrite."""
    id: UUID
    patient_id: UUID | None
    patient_name: str
    agent_type: str
    channel: str
    status: str
    last_message_preview: str
    updated_at: datetime


class ConversationDetail(ConversationListItem):
    messages: list[MessageResponse]
