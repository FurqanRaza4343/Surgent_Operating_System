from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.agent_costing import AgentCostingResponse
from src.services.agent_costing.agent_costing_services import AgentCostingService


class AgentCostingController:
    def __init__(self):
        self.service = AgentCostingService()

    async def list_all(self, db: AsyncSession) -> list[AgentCostingResponse]:
        rows = await self.service.list_all(db)
        return [AgentCostingResponse.model_validate(r) for r in rows]
