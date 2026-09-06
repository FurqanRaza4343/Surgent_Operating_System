from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.agent_config import AgentConfig
from src.schemas.agent import AgentConfigUpdate


class AgentConfigService:
    """First real reader/writer of AgentConfig.config — every prior write
    only ever set `enabled` (see provisioning_service.py). Practice-scoped;
    callers must always pass the requesting user's own practice_id."""

    async def list_configs(self, db: AsyncSession, practice_id: UUID) -> list[AgentConfig]:
        result = await db.execute(
            select(AgentConfig)
            .where(AgentConfig.practice_id == practice_id)
            .order_by(AgentConfig.agent_type)
        )
        return list(result.scalars().all())

    async def get_config(self, db: AsyncSession, practice_id: UUID, agent_type: str) -> AgentConfig:
        result = await db.execute(
            select(AgentConfig).where(AgentConfig.practice_id == practice_id, AgentConfig.agent_type == agent_type)
        )
        config = result.scalar_one_or_none()
        if config is None:
            # A practice provisioned before this agent_type existed, or the
            # row was never seeded — create it now rather than 404ing on
            # something that should always conceptually exist per practice.
            config = AgentConfig(practice_id=practice_id, agent_type=agent_type, enabled=True)
            db.add(config)
            await db.flush()
            await db.refresh(config)
        return config

    async def update_config(
        self, db: AsyncSession, practice_id: UUID, agent_type: str, data: AgentConfigUpdate
    ) -> AgentConfig:
        config = await self.get_config(db, practice_id, agent_type)
        if data.enabled is not None:
            config.enabled = data.enabled
        if data.config is not None:
            config.config = data.config
        await db.flush()
        await db.refresh(config)
        return config
