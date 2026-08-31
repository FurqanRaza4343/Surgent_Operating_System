from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.staff_message import CreateStaffMessageRequest, StaffMessageResponse, StaffMessageThreadSummary
from src.services.staff_messages.staff_message_services import StaffMessageService


class StaffMessageController:
    def __init__(self):
        self.service = StaffMessageService()

    async def list_messages(self, db: AsyncSession, user: User, staff_user_id: UUID) -> list[StaffMessageResponse]:
        messages = await self.service.list_messages(db, user.practice_id, user, staff_user_id)
        return [StaffMessageResponse.model_validate(m) for m in messages]

    async def send_message(self, db: AsyncSession, user: User, staff_user_id: UUID, data: CreateStaffMessageRequest) -> StaffMessageResponse:
        message = await self.service.send_message(db, user.practice_id, user, staff_user_id, data.body)
        return StaffMessageResponse.model_validate(message)

    async def list_threads(self, db: AsyncSession, user: User) -> list[StaffMessageThreadSummary]:
        return await self.service.list_threads(db, user.practice_id)
