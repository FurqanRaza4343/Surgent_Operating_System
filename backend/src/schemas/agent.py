from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AgentConfigUpdate(BaseModel):
    enabled: bool | None = None
    config: dict | None = None


class AgentConfigResponse(BaseModel):
    id: UUID
    practice_id: UUID
    agent_type: str
    enabled: bool
    config: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
