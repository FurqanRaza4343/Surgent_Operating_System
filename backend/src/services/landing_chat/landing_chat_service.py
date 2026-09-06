"""Landing-page AI chat (codenamed Aria).

A public, unauthenticated chat for the marketing website. Answers practice
FAQ like any good receptionist, and — when a visitor wants to book — collects
their procedure-of-interest, full name, and a contact, then creates a real
patient lead exactly like the "Book a consultation" form does (reuses
PatientsService + the Front-Desk agent slug), sources it as "Landing Chat",
pings the practice's in-app notifications, and best-effort emails the
practice. FAQ threads persist as real web_chat conversations so staff can
pick follow-up conversations up in the dashboard the same way as WhatsApp.
"""

from __future__ import annotations

import json
import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.conversation import Conversation, ConversationChannel
from src.models.message import Message, MessageRole
from src.models.patient import Patient
from src.models.practice import Practice
from src.schemas.patient import CreatePatientRequest
from src.server.exceptions import AppException
from src.services.llm.llm_service import LLMService
from src.services.notifications.notification_service import NotificationService
from src.services.patients.patients_services import PatientsService

FRONT_DESK_AGENT_SLUG = "receptionist"

# Codenamed "Aria" — friendly, memorable, and keeps the AI brand prefix the
# Aiaceone name starts with. See frontend/src/components/chat/LandingChat.tsx.
ASSISTANT_NAME = "Aria"

_HISTORY_LIMIT = 20

ARIA_SYSTEM_PROMPT = """You are Aria, the friendly AI receptionist and FAQ assistant for {practice_name}, a plastic and cosmetic surgery practice. You are chatting with website visitors who are considering a procedure, and you speak on behalf of the practice.

Your job:
- Answer questions about the practice, common procedures (rhinoplasty, breast augmentation, liposuction, facelift, botox/fillers, tummy tuck, etc.), what a first consultation involves, typical recovery expectations, and whether the visitor's concern may need surgery.
- NEVER quote specific prices, financing terms, or guaranteed outcomes as fact. If asked about cost, say pricing is confirmed by the team during a consultation.
- NEVER give medical advice, diagnose, or weigh risks beyond very general, cautious statements.
- If someone describes a medical emergency or severe symptoms, urge them to call their local emergency number immediately.
- Keep answers warm, concise, and in plain English. Aim for 2-4 sentences unless a fuller answer is genuinely needed.

Booking:
- When a visitor wants to book or be contacted, collect exactly three things, one question at a time, without sounding like a form: 1) the procedure or concern they are interested in, 2) their full name, 3) a way to reach them (phone and/or email).
- Once you have all three, tell them their consultation request has been noted and our team will reach out to book. Do not keep asking for more.
- Stay available to answer any further questions afterward.
"""

BOOKING_EXTRACT_PROMPT = """You extract booking details from a website chat transcript between a visitor and a receptionist assistant named Aria.
Return STRICT JSON only — no markdown fences, no commentary. Shape:
{"book_ready": true or false, "full_name": "...", "email": "...", "phone": "...", "chief_complaint": "...", "needs_surgery": true or false}

Rules:
- book_ready is true ONLY when all of these are present in the transcript: the visitor's full name, at least one way to reach them (phone or email), and the procedure/concern (chief_complaint).
- Use exact values the visitor gave. Leave email, phone as "" and needs_surgery as false when not provided.
- needs_surgery is true only if the visitor explicitly indicates a surgical procedure (rhinoplasty, liposuction, breast surgery, tummy tuck, facelift, etc.); otherwise false."""


class LandingChatService:
    """FAQ + booking-intent chat for the public website."""

    def __init__(self):
        self.llm = LLMService()
        self.patients = PatientsService()
        self.notifications = NotificationService()

    async def handle_message(
        self,
        db: AsyncSession,
        conversation_id: str | None,
        message_text: str,
        context: str | None = None,
    ) -> dict:
        result = await db.execute(select(Practice).order_by(Practice.created_at))
        practice = result.scalars().first()
        if practice is None:
            raise AppException("No practice is configured yet — check back soon.", status_code=400)

        conversation = await self._find_or_create_conversation(db, practice.id, conversation_id, context)

        db.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.PATIENT,
                content=message_text,
                content_type="text",
            )
        )

        history = await self._recent_history(db, conversation.id)
        reply = await self.llm.chat(
            history,
            system_prompt=ARIA_SYSTEM_PROMPT.format(practice_name=practice.name),
            tier="low",
        )

        booking_created = False
        lead_name: str | None = None
        if not conversation.extra_data.get("booking"):
            booking = await self._extract_booking(db, conversation.id)
            if booking and booking.get("book_ready"):
                patient_id, lead_name = await self._create_lead(db, practice, conversation, booking)
                conversation.extra_data = {**conversation.extra_data, "booking": {**booking, "patient_id": str(patient_id)}}
                conversation.patient_id = patient_id
                db.add(
                    Message(
                        conversation_id=conversation.id,
                        role=MessageRole.SYSTEM,
                        content=f"Booking lead created by {ASSISTANT_NAME} (landing-page chat) — patient {lead_name}.",
                        content_type="text",
                    )
                )
                booking_created = True

        db.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.AGENT,
                content=reply,
                content_type="text",
                extra_data={"assistant": ASSISTANT_NAME},
            )
        )

        await db.commit()
        return {
            "conversation_id": str(conversation.id),
            "reply": reply,
            "booking_created": booking_created,
            "lead_name": lead_name,
        }

    async def _find_or_create_conversation(
        self,
        db: AsyncSession,
        practice_id: UUID,
        conversation_id: str | None,
        context: str | None,
    ) -> Conversation:
        if conversation_id:
            result = await db.execute(select(Conversation).where(Conversation.id == UUID(str(conversation_id))))
            existing = result.scalar_one_or_none()
            if existing and existing.practice_id == practice_id:
                return existing

        conversation = Conversation(
            practice_id=practice_id,
            patient_id=None,
            agent_type=FRONT_DESK_AGENT_SLUG,
            channel=ConversationChannel.WEB_CHAT,
            extra_data={
                "channel": "landing_chat",
                "assistant": ASSISTANT_NAME,
                "context": context,
            },
        )
        db.add(conversation)
        await db.flush()
        return conversation

    async def _recent_history(self, db: AsyncSession, conversation_id: UUID) -> list[dict]:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(_HISTORY_LIMIT)
        )
        rows = list(result.scalars().all())
        rows.reverse()
        out = []
        for row in rows:
            role = {MessageRole.PATIENT: "user", MessageRole.AGENT: "assistant"}.get(row.role)
            if role and row.content.strip():
                out.append({"role": role, "content": row.content})
        return out

    async def _extract_booking(self, db: AsyncSession, conversation_id: UUID) -> dict | None:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(_HISTORY_LIMIT)
        )
        transcript_parts = []
        for row in reversed(result.scalars().all()):
            speaker = {MessageRole.PATIENT: "visitor", MessageRole.AGENT: "aria"}.get(row.role)
            if speaker and row.content.strip():
                transcript_parts.append(f"{speaker}: {row.content}")
        if len(transcript_parts) < 3:
            return None

        transcript = "\n".join(transcript_parts)
        raw = await self.llm.chat(
            [{"role": "user", "content": transcript}],
            system_prompt=BOOKING_EXTRACT_PROMPT,
            tier="low",
        )
        match = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
        except (json.JSONDecodeError, TypeError):
            return None
        if not isinstance(data, dict):
            return None
        return data

    async def _create_lead(
        self,
        db: AsyncSession,
        practice: Practice,
        conversation: Conversation,
        booking: dict,
    ) -> tuple[UUID, str]:
        name = str(booking.get("full_name") or "").strip()
        if not name:
            raise AppException("Booking details are incomplete — ask the visitor for their name.", status_code=400)
        parts = name.split(maxsplit=1)
        first_name = parts[0]
        last_name = parts[1].strip() if len(parts) > 1 else ""

        chief_complaint = str(booking.get("chief_complaint") or "").strip()
        if not chief_complaint and conversation.extra_data.get("context"):
            chief_complaint = str(conversation.extra_data["context"]).strip()

        patient = await self.patients.create_patient(
            db,
            practice.id,
            CreatePatientRequest(
                first_name=first_name,
                last_name=last_name,
                email=(booking.get("email") or None) and str(booking["email"]).strip() or None,
                phone=(booking.get("phone") or None) and str(booking["phone"]).strip() or None,
                chief_complaint=chief_complaint,
                needs_surgery=bool(booking.get("needs_surgery")),
                ai_agent_assigned=FRONT_DESK_AGENT_SLUG,
                source="Landing Chat",
            ),
        )
        await db.flush()

        await self.notifications.notify(
            db,
            practice.id,
            event_type="lead_new",
            title=f"Landing chat lead: {first_name}",
            body=f"{first_name} booked a consultation via Aria on the website — {chief_complaint[:120]}",
            resource_type="patient",
            resource_id=patient.id,
        )
        self._best_effort_email(practice, patient)
        return patient.id, patient.first_name

    def _best_effort_email(self, practice: Practice, patient: Patient) -> None:
        """Email the practice so the receptionist can follow up (SMS/WhatsApp)
        later. Lazily imported + fully guarded: email is best-effort, never a
        failure path for the chat itself, which already saved the lead + an
        in-app notification."""
        try:
            settings = get_settings()
            if not settings.sendgrid_api_key:
                return
            from src.services.email.email_service import EmailService  # noqa: PLC0415

            name = f"{patient.first_name} {patient.last_name}".strip()
            rows = [
                ("Name", name),
                ("Email", patient.email or "—"),
                ("Phone", patient.phone or "—"),
                ("Procedure / concern", patient.chief_complaint or "—"),
                ("Source", "Landing Page Chat (Aria)"),
            ]
            body_html = "".join(f"<tr><td><strong>{k}:</strong></td><td>{v}</td></tr>" for k, v in rows)
            EmailService().send(
                to=practice.email,
                subject=f"New landing-page lead — {name}",
                html_content=(
                    f"<h3>New consultation request from the website chatbot (Aria)</h3>"
                    f"<table>{body_html}</table>"
                    f"<p>Follow up with the patient in the Aiaceone dashboard (Front Desk / Leads).</p>"
                ),
            )
        except Exception:
            return