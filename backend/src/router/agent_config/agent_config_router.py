from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user, require_role
from src.models.user import User, UserRole
from src.schemas.agent import AgentConfigUpdate, AgentConfigResponse
from src.controller.agent_config.agent_config_controllers import AgentConfigController

router = APIRouter(prefix="/agent-config", tags=["Agent Config"])
controller = AgentConfigController()


@router.get("", response_model=list[AgentConfigResponse])
async def list_agent_configs(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    """All agent configs for this practice — the Agent settings page loads
    these in one call instead of one request per agent. Any practice user
    can read; writes are Owner-only (see PUT below)."""
    return await controller.list_configs(db, user)


@router.get("/{agent_type}", response_model=AgentConfigResponse)
async def get_agent_config(
    agent_type: str,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_config(db, user, agent_type)


@router.put("/{agent_type}", response_model=AgentConfigResponse)
async def update_agent_config(
    agent_type: str,
    data: AgentConfigUpdate,
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_config(db, user, agent_type, data)
