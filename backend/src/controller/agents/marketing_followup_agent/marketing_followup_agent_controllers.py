from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.services.agents.marketing_followup_agent.marketing_followup_agent_services import MarketingFollowupService


class MarketingFollowupController:
    def __init__(self):
        self.service = MarketingFollowupService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)

    async def send_offer(self, db: AsyncSession, user: User, patient_id: UUID) -> dict:
        return await self.service.send_offer(db, user.practice_id, patient_id)
