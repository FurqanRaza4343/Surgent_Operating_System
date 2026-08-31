from __future__ import annotations
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.agent_log import AgentLog
from src.services.agent_costing.agent_costing_services import AgentCostingService
from src.schemas.ai_receptionist import AIReceptionistOverviewResponse

# Each AgentLog action this module writes maps back to one of the
# pre-existing per-session cost rates (AgentCosting) — those rates predate
# the receptionist/appointment_reminder/multilingual_translation agents
# being merged into this one module, and stay keyed by their original slugs
# since the marketing catalog (frontend/src/data/agents/) still lists them
# separately.
_ACTION_TO_COST_SLUG = {
    "call_handled": "receptionist",
    "message_handled": "receptionist",
    "reminder_sent": "appointment_reminder",
    "message_translated": "multilingual_translation",
}


class AIReceptionistOverviewService:
    """Real usage + cost analytics for the AI Receptionist, replacing the
    monitor page's old MOCK_RECEPTIONIST_STATS. Practice-scoped."""

    def __init__(self):
        self.costing = AgentCostingService()

    async def get_overview(self, db: AsyncSession, practice_id: UUID) -> AIReceptionistOverviewResponse:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        all_time_counts = await self._counts_by_action(db, practice_id, since=None)
        recent_counts = await self._counts_by_action(db, practice_id, since=thirty_days_ago)

        rates = {row.agent_slug: float(row.cost_per_session) for row in await self.costing.list_all(db)}

        def total_cost(counts: dict[str, int]) -> float:
            return round(
                sum(counts.get(action, 0) * rates.get(slug, 0.0) for action, slug in _ACTION_TO_COST_SLUG.items()), 2
            )

        return AIReceptionistOverviewResponse(
            calls_handled=all_time_counts.get("call_handled", 0) + all_time_counts.get("message_handled", 0),
            reminders_sent=all_time_counts.get("reminder_sent", 0),
            translations_done=all_time_counts.get("message_translated", 0),
            total_interactions=sum(all_time_counts.values()),
            estimated_cost_total=total_cost(all_time_counts),
            estimated_cost_last_30_days=total_cost(recent_counts),
        )

    async def _counts_by_action(self, db: AsyncSession, practice_id: UUID, since: datetime | None) -> dict[str, int]:
        query = select(AgentLog.action, func.count()).where(
            AgentLog.practice_id == practice_id, AgentLog.agent_type == "ai_receptionist"
        )
        if since is not None:
            query = query.where(AgentLog.created_at >= since)
        query = query.group_by(AgentLog.action)
        result = await db.execute(query)
        return dict(result.all())
