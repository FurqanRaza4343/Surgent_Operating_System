from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.services.leads.lead_nurturing_service import LeadNurturingService


class LeadsController:
    def __init__(self):
        self.nurturing = LeadNurturingService()

    async def run_nurturing(self, db: AsyncSession, user: User) -> dict:
        sent = await self.nurturing.check_and_send_nurtures(db, practice_id=user.practice_id)
        return {"sent": sent, "count": len(sent)}
