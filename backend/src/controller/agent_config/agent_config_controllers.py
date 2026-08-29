from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.agent import AgentConfigUpdate, AgentConfigResponse
from src.services.agent_config.agent_config_service import AgentConfigService


class AgentConfigController:
    def __init__(self):
        self.service = AgentConfigService()

    async def get_config(self, db: AsyncSession, user: User, agent_type: str) -> AgentConfigResponse:
        config = await self.service.get_config(db, user.practice_id, agent_type)
        return AgentConfigResponse.model_validate(config)

    async def update_config(
        self, db: AsyncSession, user: User, agent_type: str, data: AgentConfigUpdate
    ) -> AgentConfigResponse:
        config = await self.service.update_config(db, user.practice_id, agent_type, data)
        return AgentConfigResponse.model_validate(config)
