from __future__ import annotations
from pydantic import BaseModel


class AgentCostingResponse(BaseModel):
    agent_slug: str
    cost_per_session: float
    is_active: bool
    total_sessions: int
    total_earned: float

    class Config:
        from_attributes = True
