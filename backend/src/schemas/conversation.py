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
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
