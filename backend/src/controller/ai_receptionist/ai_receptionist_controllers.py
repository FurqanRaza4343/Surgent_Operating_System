from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.ai_receptionist import (
    HandleCallResponse,
    ChatMessageResponse,
    TranslateResponse,
    SendReminderResponse,
    AIReceptionistOverviewResponse,
)
from src.services.ai_receptionist.voice_chat_service import VoiceChatService
from src.services.ai_receptionist.reminder_service import ReminderService
from src.services.ai_receptionist.translation_service import TranslationService
from src.services.ai_receptionist.overview_service import AIReceptionistOverviewService


class AIReceptionistController:
    def __init__(self):
        self.voice_chat = VoiceChatService()
        self.reminders = ReminderService()
        self.translation = TranslationService()
        self.overview = AIReceptionistOverviewService()

    async def handle_call(self, db: AsyncSession, user: User) -> HandleCallResponse:
        result = await self.voice_chat.handle_call(db, user.practice_id, performed_by="ai_agent")
        return HandleCallResponse(**result)

    async def process_message(self, db: AsyncSession, user: User, message: str) -> ChatMessageResponse:
        response = await self.voice_chat.process_message(db, user.practice_id, message, performed_by="ai_agent")
        return ChatMessageResponse(response=response)

    async def translate(self, db: AsyncSession, user: User, text: str, target_language: str) -> TranslateResponse:
        translated = await self.translation.translate(db, user.practice_id, text, target_language, performed_by=str(user.id))
        return TranslateResponse(translated_text=translated)

    async def send_reminder(self, db: AsyncSession, user: User, appointment_id: UUID) -> SendReminderResponse:
        result = await self.reminders.send_reminder(db, user.practice_id, appointment_id, performed_by="ai_agent")
        return SendReminderResponse(**result)

    async def get_overview(self, db: AsyncSession, user: User) -> AIReceptionistOverviewResponse:
        return await self.overview.get_overview(db, user.practice_id)
