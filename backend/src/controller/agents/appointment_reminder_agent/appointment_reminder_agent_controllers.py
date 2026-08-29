from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.services.agents.appointment_reminder_agent.appointment_reminder_agent_services import AppointmentReminderService


class AppointmentReminderController:
    def __init__(self):
        self.service = AppointmentReminderService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)

    async def send_reminder(self, db: AsyncSession, user: User, appointment_id: UUID) -> dict:
        return await self.service.send_reminder(db, user.practice_id, appointment_id)
