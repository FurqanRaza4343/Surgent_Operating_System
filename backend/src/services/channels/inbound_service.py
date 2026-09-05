from __future__ import annotations
import json
from datetime import datetime, date as date_cls, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.conversation import Conversation, ConversationChannel, ConversationStatus
from src.models.message import Message, MessageRole
from src.models.patient import Patient
from src.models.practice import Practice
from src.models.doctor import Doctor
from src.models.appointment import Appointment, AppointmentStatus
from src.services.llm.llm_service import LLMService
from src.services.agent_log.agent_log_service import AgentLogService
from src.services.appointments.appointments_services import AppointmentsService
from src.services.channels.whatsapp_green_api import WhatsAppGreenAPI

_WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
_APPOINTMENT_DURATION_MINUTES = 30


def _system_prompt(is_new_patient: bool, today: date_cls) -> str:
    patient_context = (
        "This is a NEW patient — you don't have any prior visit on file for them. "
        "Greet them warmly and get their name if the conversation doesn't already make it clear."
        if is_new_patient
        else "This is a RETURNING patient — you already have their record. "
        "Acknowledge that warmly (e.g. \"welcome back\") instead of asking who they are."
    )
    return (
        "You are a warm, professional AI receptionist for a plastic surgery clinic, replying over WhatsApp. "
        f"{patient_context}\n\n"
        "You help with: booking appointments, questions about procedures (rhinoplasty, breast augmentation, "
        "liposuction, facelift, Botox, dermal fillers, etc.), pricing, clinic hours, and general post-op questions.\n\n"
        "When a patient wants to book:\n"
        "1. Ask for their preferred date, time, and what the visit is for, if you don't already have all three.\n"
        "2. Once you have a specific date, time, and reason, call book_appointment. You do NOT need to ask which "
        "doctor — the system automatically assigns whichever doctor actually has an opening at that time.\n"
        "3. If it succeeds, confirm the booking warmly, including which doctor they're seeing.\n"
        "4. If no one is free at that time, apologize and ask for a different date or time — then try again.\n\n"
        "If the patient explicitly asks for a real person, or you genuinely cannot help with something, call "
        "request_human_handoff with a short reason, then let them know a team member will follow up shortly.\n\n"
        f"Today's date is {today.isoformat()}. Keep every reply short and WhatsApp-appropriate — 2-4 sentences. "
        "Never diagnose or give clinical medical advice — that's the doctor's job, not yours."
    )


def _booking_tools() -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": "book_appointment",
                "description": (
                    "Book a real appointment for this patient. The system finds whichever doctor is actually "
                    "free at the requested date/time and books them automatically — do not ask the patient to "
                    "pick a doctor."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string", "description": "Appointment date, YYYY-MM-DD"},
                        "time": {"type": "string", "description": "Appointment time, 24-hour HH:MM"},
                        "appointment_type": {
                            "type": "string",
                            "description": "What the visit is for, e.g. 'Consultation', 'Botox', 'Rhinoplasty consultation'",
                        },
                    },
                    "required": ["date", "time", "appointment_type"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "request_human_handoff",
                "description": "Flag this conversation for a real staff member to take over.",
                "parameters": {
                    "type": "object",
                    "properties": {"reason": {"type": "string", "description": "Short reason a human is needed"}},
                    "required": ["reason"],
                },
            },
        },
    ]


class InboundService:
    """Handles inbound messages from WhatsApp (and later Facebook/Instagram).
    Orchestrates: find practice → find/create conversation → generate AI reply
    (with real booking/escalation tools) → send reply → persist everything."""

    def __init__(self):
        self.llm = LLMService()
        self.agent_log = AgentLogService()
        self.appointments = AppointmentsService()

    async def handle_whatsapp_message(
        self,
        db: AsyncSession,
        phone_number: str,
        sender_name: str,
        message_text: str,
        instance_id: str,
    ) -> dict:
        """Full inbound flow for a WhatsApp message."""

        # 1. Find the practice that owns this Green API instance
        practice = await self._find_practice_by_whatsapp_instance(db, instance_id)
        if not practice:
            return {"error": "No practice found for this WhatsApp instance", "handled": False}

        # 2. Find or create the patient by phone number — every patient's
        # phone number is their durable identity here, so the same person
        # texting again always lands back on the same patient record and
        # conversation, first visit or not.
        patient, is_new_patient = await self._find_or_create_patient(db, practice.id, phone_number, sender_name)

        # 3. Find or create the conversation
        conversation = await self._find_or_create_conversation(
            db, practice.id, patient.id, ConversationChannel.WHATSAPP
        )
        await self._ensure_avatar_cached(practice, conversation, phone_number)

        # 4. Save the incoming patient message
        patient_msg = Message(
            conversation_id=conversation.id,
            role=MessageRole.PATIENT,
            content=message_text,
            content_type="text",
        )
        db.add(patient_msg)

        # A staff member replying manually pauses AI auto-reply (see
        # ConversationsService.send_staff_message) so the two never talk
        # over each other. The patient messaging back in doesn't
        # automatically un-pause it — a human already engaged should be the
        # one to hand it back, not have the AI silently reassert control.
        ai_paused = bool((conversation.extra_data or {}).get("ai_paused"))
        conversation.status = ConversationStatus.NEEDS_ATTENTION if ai_paused else ConversationStatus.ACTIVE
        await db.flush()
        # Commit the incoming message on its own, before ever attempting an
        # AI reply. Previously everything below this point ran in the same
        # uncommitted transaction as the patient's message — an LLM failure
        # (rate limit, network blip, anything) raised past this function
        # with nothing committed, silently discarding the message the
        # patient actually sent, not just the missing reply. A message that
        # was truly received must never be lost because of what happens next.
        await db.commit()

        if ai_paused:
            await self.agent_log.log(
                db,
                practice.id,
                agent_type="ai_receptionist",
                action="whatsapp_message_received_ai_paused",
                details={"patient_phone": phone_number, "incoming_preview": message_text[:200]},
                performed_by="system",
            )
            return {
                "handled": True,
                "practice_id": str(practice.id),
                "patient_id": str(patient.id),
                "conversation_id": str(conversation.id),
                "reply": None,
                "sent": False,
                "ai_paused": True,
            }

        # 5. Generate AI reply using conversation history + real booking/
        # escalation tools — if this fails for any reason (LLM rate limit,
        # network blip, anything), the patient's message is already safely
        # committed above; degrade to flagging a human instead of losing the
        # message or crashing the whole request.
        try:
            ai_reply, escalated, escalation_reason = await self._generate_reply(
                db, practice, patient, conversation, message_text, is_new_patient
            )
        except Exception:
            conversation.status = ConversationStatus.NEEDS_ATTENTION
            db.add(Message(
                conversation_id=conversation.id,
                role=MessageRole.SYSTEM,
                content="⚠️ The AI Receptionist couldn't respond (a technical issue) — please reply directly.",
                content_type="text",
            ))
            await db.flush()
            await self.agent_log.log(
                db,
                practice.id,
                agent_type="ai_receptionist",
                action="whatsapp_ai_reply_failed",
                details={"patient_phone": phone_number, "incoming_preview": message_text[:200]},
                performed_by="system",
            )
            await db.commit()
            return {
                "handled": True,
                "practice_id": str(practice.id),
                "patient_id": str(patient.id),
                "conversation_id": str(conversation.id),
                "reply": None,
                "sent": False,
                "ai_failed": True,
            }

        # 6. Save the AI reply
        agent_msg = Message(
            conversation_id=conversation.id,
            role=MessageRole.AGENT,
            content=ai_reply,
            content_type="text",
        )
        db.add(agent_msg)
        if escalated:
            conversation.status = ConversationStatus.NEEDS_ATTENTION
            reason_text = f": {escalation_reason}" if escalation_reason else ""
            db.add(Message(
                conversation_id=conversation.id,
                role=MessageRole.SYSTEM,
                content=f"🔔 The AI Receptionist requested a human{reason_text}",
                content_type="text",
            ))
        await db.flush()

        # 7. Send reply back via WhatsApp
        sent = await self._send_reply(practice, phone_number, ai_reply)

        # 8. Log the action
        await self.agent_log.log(
            db,
            practice.id,
            agent_type="ai_receptionist",
            action="whatsapp_ai_escalated" if escalated else "whatsapp_message_handled",
            details={
                "patient_phone": phone_number,
                "incoming_preview": message_text[:200],
                "reply_preview": ai_reply[:200],
                "sent": sent,
            },
            performed_by="ai_agent",
        )
        await db.commit()

        return {
            "handled": True,
            "practice_id": str(practice.id),
            "patient_id": str(patient.id),
            "conversation_id": str(conversation.id),
            "reply": ai_reply,
            "sent": sent,
            "escalated": escalated,
        }

    async def _ensure_avatar_cached(self, practice: Practice, conversation: Conversation, phone_number: str) -> None:
        """Fetches the WhatsApp contact photo once per conversation and
        caches it on extra_data — avoids an extra Green API round trip on
        every single message just to re-fetch a photo that rarely changes.

        Only caches a result once Green API has *definitively* answered
        (a clean 200, even if the answer is "no photo") — Green API's free
        tier gives getAvatar a low monthly call quota that runs out fast,
        and a failed check (quota exceeded, network blip) must not get
        permanently cached as "no photo," or a real photo would never show
        up once quota resets or the transient error clears."""
        extra = conversation.extra_data or {}
        if "avatar_url" in extra:
            return
        ga = WhatsAppGreenAPI.from_practice_settings(practice.settings or {})
        if ga is None:
            return
        try:
            avatar_url, definitive = await ga.get_avatar(phone_number)
        except Exception:
            return
        if not definitive:
            return
        conversation.extra_data = {**extra, "avatar_url": avatar_url}

    async def _find_practice_by_whatsapp_instance(
        self, db: AsyncSession, instance_id: str
    ) -> Practice | None:
        """Find a practice whose settings contain this Green API instance_id."""
        result = await db.execute(select(Practice))
        for practice in result.scalars().all():
            ga = (practice.settings or {}).get("green_api", {})
            if ga.get("instance_id") == instance_id:
                return practice
        return None

    async def _find_or_create_patient(
        self, db: AsyncSession, practice_id: UUID, phone: str, sender_name: str
    ) -> tuple[Patient, bool]:
        """Find existing patient by phone or create a new one. Returns
        (patient, is_new) — the AI's system prompt uses is_new to greet a
        returning patient differently instead of asking who they are again."""
        result = await db.execute(
            select(Patient).where(
                Patient.practice_id == practice_id,
                Patient.phone == phone,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing, False

        # Split sender_name into first/last
        parts = (sender_name or "Unknown").strip().split(" ", 1)
        first_name = parts[0] if parts else "Unknown"
        last_name = parts[1] if len(parts) > 1 else ""

        patient = Patient(
            practice_id=practice_id,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            source="WhatsApp",
            lifecycle_stage="contacted",
        )
        db.add(patient)
        await db.flush()
        return patient, True

    async def _find_or_create_conversation(
        self, db: AsyncSession, practice_id: UUID, patient_id: UUID, channel: ConversationChannel
    ) -> Conversation:
        """Find existing active conversation or create a new one."""
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.practice_id == practice_id,
                Conversation.patient_id == patient_id,
                Conversation.channel == channel,
                Conversation.agent_type == "ai_receptionist",
            )
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing and existing.status != ConversationStatus.RESOLVED:
            return existing

        conversation = Conversation(
            practice_id=practice_id,
            patient_id=patient_id,
            agent_type="ai_receptionist",
            channel=channel,
        )
        db.add(conversation)
        await db.flush()
        return conversation

    async def _find_available_doctor(
        self, db: AsyncSession, practice_id: UUID, when: datetime
    ) -> Doctor | None:
        """Picks whichever active doctor is actually free at `when` — checks
        their recurring working_hours for that weekday (a doctor with no
        working_hours set at all is treated as generally available, matching
        how the seed data's "Test Doctor" was left unconfigured) and that
        they don't already have a conflicting appointment. Returns the first
        match; doesn't try to load-balance between multiple free doctors."""
        weekday_key = _WEEKDAY_KEYS[when.weekday()]
        result = await db.execute(select(Doctor).where(Doctor.practice_id == practice_id, Doctor.is_active == True))  # noqa: E712
        doctors = list(result.scalars().all())

        window_start = when
        window_end = when + timedelta(minutes=_APPOINTMENT_DURATION_MINUTES)

        for doctor in doctors:
            hours = doctor.working_hours or {}
            if hours:
                # This doctor HAS a recurring schedule defined — a weekday
                # simply missing from it (e.g. Amina's hours only list
                # mon/wed/fri) means "doesn't work that day," not "no
                # schedule configured." Conflating the two used to let a
                # Tuesday booking land on a Monday/Wednesday/Friday-only
                # doctor — a real bug caught by testing every weekday, not
                # just one.
                day_windows = hours.get(weekday_key)
                if not day_windows:
                    continue
                fits = False
                for w in day_windows:
                    try:
                        start_h, start_m = (int(x) for x in w["start"].split(":"))
                        end_h, end_m = (int(x) for x in w["end"].split(":"))
                    except (KeyError, ValueError):
                        continue
                    day_start = when.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
                    day_end = when.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
                    if day_start <= window_start and window_end <= day_end:
                        fits = True
                        break
                if not fits:
                    continue
            # else: hours is completely empty — no schedule configured for
            # this doctor at all — treat as generally available rather than
            # blocking every booking for someone who just hasn't set hours yet.

            conflict_result = await db.execute(
                select(Appointment).where(
                    Appointment.doctor_id == doctor.id,
                    Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
                    Appointment.start_time < window_end,
                    Appointment.end_time > window_start,
                )
            )
            if conflict_result.scalars().first() is not None:
                continue

            return doctor

        return None

    async def _execute_tool(
        self,
        db: AsyncSession,
        practice: Practice,
        patient: Patient,
        tool_name: str,
        tool_args: dict,
    ) -> tuple[str, bool]:
        """Runs one tool call for real — actual DB reads/writes, never
        LLM-fabricated results. Returns (result_text_for_the_llm, escalate)."""
        if tool_name == "book_appointment":
            try:
                when = datetime.strptime(f"{tool_args['date']} {tool_args['time']}", "%Y-%m-%d %H:%M")
                when = when.replace(tzinfo=timezone.utc)
            except (KeyError, ValueError):
                return "Invalid date/time format — ask the patient to confirm a specific date (YYYY-MM-DD) and time.", False

            if when < datetime.now(timezone.utc):
                return "That date/time is in the past — ask the patient for an upcoming date.", False

            doctor = await self._find_available_doctor(db, practice.id, when)
            if doctor is None:
                return (
                    f"No doctor is available at {tool_args['date']} {tool_args['time']}. "
                    "Ask the patient for a different date or time and try again.",
                    False,
                )

            appointment_type = str(tool_args.get("appointment_type") or "Consultation")
            appointment = await self.appointments.create_appointment(
                db,
                practice.id,
                patient.id,
                doctor.id,
                appointment_type,
                when,
                when + timedelta(minutes=_APPOINTMENT_DURATION_MINUTES),
                notes="Booked by AI Receptionist via WhatsApp",
            )
            await self.agent_log.log(
                db,
                practice.id,
                agent_type="ai_receptionist",
                action="whatsapp_appointment_booked",
                details={
                    "patient_id": str(patient.id),
                    "doctor_id": str(doctor.id),
                    "doctor_name": doctor.name,
                    "appointment_id": str(appointment.id),
                    "start_time": when.isoformat(),
                },
                performed_by="ai_agent",
            )
            # doctor.name is free text — some rows already include "Dr."
            # (e.g. "Dr. Amina Siddiqui"), others don't (e.g. "Test Doctor").
            # Prepending it unconditionally produced "Dr. Dr. Amina Siddiqui".
            display_name = doctor.name if doctor.name.lower().startswith("dr") else f"Dr. {doctor.name}"
            return (
                f"Booked successfully with {display_name} on {tool_args['date']} at {tool_args['time']} "
                f"for {appointment_type}. Confirm these exact details back to the patient.",
                False,
            )

        if tool_name == "request_human_handoff":
            reason = str(tool_args.get("reason") or "Patient requested a human / AI could not help.")
            await self.agent_log.log(
                db,
                practice.id,
                agent_type="ai_receptionist",
                action="whatsapp_human_requested",
                details={"patient_id": str(patient.id), "reason": reason},
                performed_by="ai_agent",
            )
            return "A staff member has been notified and will follow up shortly.", True

        return f"Unknown tool: {tool_name}", False

    async def _generate_reply(
        self,
        db: AsyncSession,
        practice: Practice,
        patient: Patient,
        conversation: Conversation,
        new_message: str,
        is_new_patient: bool,
    ) -> tuple[str, bool]:
        """Generate an AI reply using the conversation history for context,
        with real booking/escalation tools available. Returns (reply_text,
        escalated_to_human, escalation_reason)."""
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(desc(Message.created_at))
            .limit(20)
        )
        recent_messages = list(reversed(result.scalars().all()))

        llm_messages = []
        for msg in recent_messages:
            role = "assistant" if msg.role == MessageRole.AGENT else "user"
            llm_messages.append({"role": role, "content": msg.content})
        llm_messages.append({"role": "user", "content": new_message})

        system_prompt = _system_prompt(is_new_patient, datetime.now(timezone.utc).date())
        tools = _booking_tools()

        first = await self.llm.chat_with_tools(
            messages=llm_messages, tools=tools, system_prompt=system_prompt, tier="low"
        )
        tool_calls = first.get("tool_calls") or []
        if not tool_calls:
            return first.get("content") or "Thanks for reaching out — how can I help?", False, None

        escalated = False
        escalation_reason: str | None = None
        tool_result_messages: list[dict] = []
        for tc in tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except (json.JSONDecodeError, TypeError):
                args = {}
            summary, did_escalate = await self._execute_tool(db, practice, patient, tc.function.name, args)
            if did_escalate:
                escalated = True
                escalation_reason = str(args.get("reason") or "").strip() or None
            tool_result_messages.append({"role": "tool", "tool_call_id": tc.id, "content": summary})

        assistant_message = {
            "role": "assistant",
            "content": first.get("content") or None,
            "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in tool_calls
            ],
        }

        final = await self.llm.chat(
            messages=[*llm_messages, assistant_message, *tool_result_messages],
            system_prompt=system_prompt,
            tier="low",
        )
        return final, escalated, escalation_reason

    async def _send_reply(self, practice: Practice, phone_number: str, message: str) -> bool:
        """Send reply via WhatsApp Green API. Returns True on success."""
        ga = WhatsAppGreenAPI.from_practice_settings(practice.settings or {})
        if not ga:
            return False
        try:
            result = await ga.send_text(phone_number, message)
            return result.get("sendMessageResult", {}).get("sent", False) is True or "idMessage" in result.get("sendMessageResult", {})
        except Exception:
            return False
