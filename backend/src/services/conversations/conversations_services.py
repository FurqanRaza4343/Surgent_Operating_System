from __future__ import annotations
from uuid import UUID

from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.conversation import Conversation, ConversationStatus
from src.models.message import Message
from src.models.patient import Patient
from src.server.exceptions import NotFoundException


class ConversationsService:
    """Backs the dashboard's unified Agent Sessions inbox
    (frontend/src/app/dashboard/sessions/) — every method here is
    practice-scoped; callers must always pass the requesting user's own
    practice_id (see server/dependencies.py:get_current_practice_user),
    never trust one from the client."""

    async def list_conversations(
        self,
        db: AsyncSession,
        practice_id: UUID,
        status: ConversationStatus | None = None,
        channel: str | None = None,
        agent_types: list[str] | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Conversation]:
        query = (
            select(Conversation)
            .where(Conversation.practice_id == practice_id)
            .options(selectinload(Conversation.patient), selectinload(Conversation.messages))
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )
        if status is not None:
            query = query.where(Conversation.status == status)
        if channel is not None:
            query = query.where(Conversation.channel == channel)
        if agent_types:
            query = query.where(Conversation.agent_type.in_(agent_types))
        if search:
            # Matches by patient name — a conversation with no linked patient
            # yet just won't match a text search, which is correct (there's
            # nothing to search on).
            pattern = f"%{search}%"
            query = query.join(Conversation.patient).where(
                or_(Patient.first_name.ilike(pattern), Patient.last_name.ilike(pattern))
            )

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_conversation(self, db: AsyncSession, practice_id: UUID, conversation_id: UUID) -> Conversation:
        query = (
            select(Conversation)
            .where(Conversation.id == conversation_id, Conversation.practice_id == practice_id)
            .options(
                selectinload(Conversation.patient),
                selectinload(Conversation.messages),
            )
        )
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        if conversation is None:
            raise NotFoundException("Conversation not found")
        return conversation

    async def resolve_conversation(self, db: AsyncSession, practice_id: UUID, conversation_id: UUID) -> Conversation:
        conversation = await self.get_conversation(db, practice_id, conversation_id)
        conversation.status = ConversationStatus.RESOLVED
        conversation.is_active = False
        await db.flush()
        return conversation

    @staticmethod
    def last_message_preview(conversation: Conversation) -> str:
        if not conversation.messages:
            return ""
        latest = max(conversation.messages, key=lambda m: m.created_at)
        return latest.content[:160]

    @staticmethod
    def patient_display_name(conversation: Conversation) -> str:
        if conversation.patient is None:
            return "Unknown"
        return f"{conversation.patient.first_name} {conversation.patient.last_name}".strip()
