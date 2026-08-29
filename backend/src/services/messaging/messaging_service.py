from __future__ import annotations
import asyncio
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.conversation import Conversation, ConversationChannel
from src.models.message import Message, MessageRole
from src.models.patient import Patient
from src.server.exceptions import AppException, NotFoundException
from src.services.twilio.twilio_service import TwilioService
from src.services.whatsapp.whatsapp_service import WhatsAppService


class MessagingService:
    """Shared outbound-messaging path for every agent that needs to reach a
    patient (reminders, review requests, marketing offers) — resolves which
    channel to use, sends via the real Twilio/WhatsApp clients, and records
    the send as a real Conversation/Message so it shows up in the dashboard's
    Agent Sessions inbox like any other conversation."""

    def __init__(self):
        self.twilio = TwilioService()
        self.whatsapp = WhatsAppService()

    async def resolve_channel(self, db: AsyncSession, practice_id: UUID, patient: Patient) -> ConversationChannel:
        # No stored channel preference exists on Patient — infer from the
        # patient's most recent conversation (how they last actually reached
        # the practice), falling back to SMS if they have a phone on file and
        # WhatsApp is unavailable to infer from. See models/patient.py.
        result = await db.execute(
            select(Conversation)
            .where(Conversation.practice_id == practice_id, Conversation.patient_id == patient.id)
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        if latest is not None and latest.channel in (ConversationChannel.SMS, ConversationChannel.WHATSAPP, ConversationChannel.PHONE):
            return ConversationChannel.SMS if latest.channel == ConversationChannel.PHONE else latest.channel
        if patient.phone:
            return ConversationChannel.SMS
        raise AppException("No phone number or messaging channel on file for this patient")

    async def _find_or_create_conversation(
        self, db: AsyncSession, practice_id: UUID, patient_id: UUID, agent_type: str, channel: ConversationChannel
    ) -> Conversation:
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.practice_id == practice_id,
                Conversation.patient_id == patient_id,
                Conversation.agent_type == agent_type,
            )
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            return existing

        conversation = Conversation(
            practice_id=practice_id,
            patient_id=patient_id,
            agent_type=agent_type,
            channel=channel,
        )
        db.add(conversation)
        await db.flush()
        return conversation

    async def send_and_log(
        self, db: AsyncSession, practice_id: UUID, patient: Patient, agent_type: str, text: str
    ) -> Message:
        channel = await self.resolve_channel(db, practice_id, patient)
        if not patient.phone:
            raise AppException("Patient has no phone number on file to message")

        try:
            if channel == ConversationChannel.WHATSAPP:
                await self.whatsapp.send_text(patient.phone, text)
            else:
                # Twilio's SDK is synchronous (blocking network I/O) — run it
                # off the event loop rather than stalling every other
                # in-flight request.
                await asyncio.to_thread(self.twilio.send_sms, patient.phone, text)
        except Exception as exc:
            raise AppException(f"Failed to send message via {channel.value}: {exc}")

        conversation = await self._find_or_create_conversation(db, practice_id, patient.id, agent_type, channel)
        message = Message(conversation_id=conversation.id, role=MessageRole.AGENT, content=text)
        db.add(message)
        await db.flush()
        return message
