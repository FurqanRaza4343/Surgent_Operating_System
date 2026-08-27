from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.agent_costing import AgentCostingResponse
from src.controller.agent_costing.agent_costing_controllers import AgentCostingController

# No auth — per-session agent cost is platform pricing info, not
# practice-sensitive data (same tier for everyone), and the dashboard's
# Agent Settings page needs it before any practice-auth chain necessarily exists.
router = APIRouter(prefix="/agent-costing", tags=["Agent Costing"])
controller = AgentCostingController()


@router.get("", response_model=list[AgentCostingResponse])
async def list_agent_costing(db: AsyncSession = Depends(get_db)):
    return await controller.list_all(db)
