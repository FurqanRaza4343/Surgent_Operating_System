from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.services.agent_config.agent_config_service import AgentConfigService
from src.services.messaging.messaging_service import MessagingService
from src.services.agent_log.agent_log_service import AgentLogService
from src.server.exceptions import NotFoundException, AppException


class MarketingFollowupService:
    def __init__(self):
        self.agent_config = AgentConfigService()
        self.messaging = MessagingService()
        self.agent_log = AgentLogService()

    async def get_status(self, user: dict) -> dict:
        return {"agent": "marketing_followup", "status": "active", "user": user.get("sub")}

    def _active_offer(self, config: dict) -> dict | None:
        offers = config.get("offers") or []
        now = datetime.now(timezone.utc)
        for offer in offers:
            expires_at = offer.get("expires_at")
            if not expires_at:
                return offer
            try:
                if datetime.fromisoformat(expires_at.replace("Z", "+00:00")) > now:
                    return offer
            except ValueError:
                continue
        return None

    async def send_offer(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> dict:
        result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")

        config = await self.agent_config.get_config(db, practice_id, "marketing_followup")
        offer = self._active_offer(config.config)
        if offer is None:
            raise AppException("No active marketing offers configured for this practice")

        text = f"Hi {patient.first_name}, {offer.get('title', 'we have an offer for you')} — {offer.get('description', '')}".strip()

        message = await self.messaging.send_and_log(db, practice_id, patient, "marketing_followup", text)
        await self.agent_log.log(
            db,
            practice_id,
            agent_type="marketing_followup",
            action="offer_sent",
            details={"patient_id": str(patient.id), "offer_title": offer.get("title")},
            performed_by="ai_agent",
        )
        return {"patient_id": str(patient.id), "message_id": str(message.id), "offer": offer}
