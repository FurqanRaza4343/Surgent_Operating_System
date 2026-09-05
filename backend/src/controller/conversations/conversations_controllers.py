from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.conversation import Conversation, ConversationStatus
from src.models.user import User
from src.schemas.conversation import ConversationListItem, ConversationDetail, MessageResponse
from src.services.conversations.conversations_services import ConversationsService


class ConversationsController:
    def __init__(self):
        self.service = ConversationsService()

    def _list_item(self, c: Conversation) -> ConversationListItem:
        extra = c.extra_data or {}
        return ConversationListItem(
            id=c.id,
            patient_id=c.patient_id,
            patient_name=self.service.patient_display_name(c),
            agent_type=c.agent_type,
            channel=c.channel.value,
            status=c.status.value,
            last_message_preview=self.service.last_message_preview(c),
            updated_at=c.updated_at,
            avatar_url=extra.get("avatar_url"),
            ai_paused=bool(extra.get("ai_paused")),
        )

    async def list_conversations(
        self,
        db: AsyncSession,
        user: User,
        status: ConversationStatus | None,
        channel: str | None,
        agent_type: list[str] | None,
        search: str | None,
        limit: int,
        offset: int,
    ) -> list[ConversationListItem]:
        conversations = await self.service.list_conversations(
            db,
            practice_id=user.practice_id,
            status=status,
            channel=channel,
            agent_types=agent_type,
            search=search,
            limit=limit,
            offset=offset,
        )
        return [self._list_item(c) for c in conversations]

    async def get_conversation(self, db: AsyncSession, user: User, conversation_id: UUID) -> ConversationDetail:
        c = await self.service.get_conversation(db, user.practice_id, conversation_id)
        item = self._list_item(c)
        return ConversationDetail(
            **item.model_dump(),
            messages=[MessageResponse.model_validate(m) for m in sorted(c.messages, key=lambda m: m.created_at)],
        )

    async def resolve_conversation(self, db: AsyncSession, user: User, conversation_id: UUID) -> ConversationDetail:
        await self.service.resolve_conversation(db, user.practice_id, conversation_id)
        return await self.get_conversation(db, user, conversation_id)

    async def send_message(self, db: AsyncSession, user: User, conversation_id: UUID, body: str) -> ConversationDetail:
        await self.service.send_staff_message(db, user.practice_id, conversation_id, body)
        return await self.get_conversation(db, user, conversation_id)

    async def toggle_ai(self, db: AsyncSession, user: User, conversation_id: UUID, paused: bool) -> ConversationDetail:
        await self.service.toggle_ai(db, user.practice_id, conversation_id, paused)
        return await self.get_conversation(db, user, conversation_id)
