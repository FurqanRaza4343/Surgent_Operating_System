from __future__ import annotations
from uuid import UUID

from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.conversation import Conversation, ConversationChannel, ConversationStatus
from src.models.message import Message, MessageRole
from src.models.patient import Patient
from src.models.practice import Practice
from src.server.exceptions import NotFoundException
from src.services.channels.whatsapp_green_api import WhatsAppGreenAPI


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
        patient_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Conversation]:
        query = (
            select(Conversation)
            .where(
                Conversation.practice_id == practice_id,
                # "Main Agent" (Command Center) sessions live in this same
                # table (see command_center_services.py) but are a staff
                # tool, not a patient conversation — they have no patient_id
                # and don't belong in this patient-facing inbox. Command
                # Center has its own dedicated history view already.
                Conversation.agent_type != "command_center",
            )
            .options(selectinload(Conversation.patient), selectinload(Conversation.messages))
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )
        if patient_id is not None:
            query = query.where(Conversation.patient_id == patient_id)
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

    async def send_staff_message(
        self, db: AsyncSession, practice_id: UUID, conversation_id: UUID, body: str
    ) -> Conversation:
        """A staff member replying directly in a conversation — sends over
        the real channel (WhatsApp today) if the conversation has one, and
        pauses AI auto-replies so the AI Receptionist doesn't talk over a
        human who's already taken over. See InboundService._generate_reply's
        ai_paused check for the other half of this."""
        conversation = await self.get_conversation(db, practice_id, conversation_id)

        message = Message(conversation_id=conversation.id, role=MessageRole.STAFF, content=body, content_type="text")
        db.add(message)
        conversation.messages.append(message)

        conversation.extra_data = {**(conversation.extra_data or {}), "ai_paused": True}
        conversation.status = ConversationStatus.ACTIVE
        await db.flush()

        if conversation.channel == ConversationChannel.WHATSAPP and conversation.patient is not None and conversation.patient.phone:
            practice = await db.get(Practice, practice_id)
            wa = WhatsAppGreenAPI.from_practice_settings((practice.settings if practice else None) or {})
            if wa is not None:
                try:
                    await wa.send_text(conversation.patient.phone, body)
                except Exception:
                    # The message is already saved either way — a failed send
                    # doesn't lose the staff member's reply, it just means the
                    # patient won't see it over WhatsApp this time.
                    pass

        return conversation

    async def toggle_ai(self, db: AsyncSession, practice_id: UUID, conversation_id: UUID, paused: bool) -> Conversation:
        conversation = await self.get_conversation(db, practice_id, conversation_id)
        conversation.extra_data = {**(conversation.extra_data or {}), "ai_paused": paused}
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
