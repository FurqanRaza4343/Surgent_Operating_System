from __future__ import annotations
import json
import logging
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.message import Message, MessageRole
from src.models.patient import Patient
from src.services.llm.llm_service import LLMService

logger = logging.getLogger(__name__)

_MIN_PATIENT_MESSAGES = 2

_SYSTEM_PROMPT = (
    "You score how qualified an inbound plastic-surgery-clinic lead is, based only on what they've actually "
    "said in the conversation below — never invent details they didn't mention. Respond with ONLY a JSON object, "
    "no other text, in exactly this shape:\n"
    '{"interested_procedure": string|null, "budget_signal": "low"|"medium"|"high"|"unknown", '
    '"urgency": "immediate"|"within_month"|"just_browsing"|"unknown", "score": integer 0-100, '
    '"summary": "one short sentence for staff"}\n\n'
    "score reflects how likely this lead is to book and pay for a real procedure — a specific procedure named, "
    "a real timeframe, and price questions all raise it; \"just looking\"/vague browsing lowers it."
)


class LeadQualificationService:
    """Runs once per lead, after they've said enough for a judgment to mean
    anything — scores fit/intent from the conversation so far so staff can
    triage inbound leads without reading every transcript themselves. This
    is a read of the conversation, not a participant in it: it never sends
    a message or blocks the AI receptionist's own reply, and a failure here
    must never break the inbound-message flow it's called from."""

    def __init__(self):
        self.llm = LLMService()

    async def maybe_qualify(self, db: AsyncSession, patient: Patient, conversation_id: UUID) -> None:
        if patient.qualification is not None:
            return

        count_result = await db.execute(
            select(func.count()).select_from(Message).where(
                Message.conversation_id == conversation_id, Message.role == MessageRole.PATIENT
            )
        )
        if (count_result.scalar_one() or 0) < _MIN_PATIENT_MESSAGES:
            return

        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(20)
        )
        transcript = "\n".join(
            f"{'Patient' if m.role == MessageRole.PATIENT else 'Clinic'}: {m.content}"
            for m in reversed(list(result.scalars().all()))
        )

        try:
            raw = await self.llm.chat(
                messages=[{"role": "user", "content": transcript}],
                system_prompt=_SYSTEM_PROMPT,
                tier="low",
            )
            data = json.loads(raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip())
            patient.qualification = {
                "interested_procedure": data.get("interested_procedure"),
                "budget_signal": data.get("budget_signal") or "unknown",
                "urgency": data.get("urgency") or "unknown",
                "score": max(0, min(100, int(data.get("score", 0)))),
                "summary": str(data.get("summary") or "")[:500],
            }
        except Exception:
            logger.exception("Lead qualification failed for patient %s — leaving unqualified for a later retry", patient.id)
