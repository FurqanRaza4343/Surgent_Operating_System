from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.agent_log import AgentLog


class AgentLogService:
    """Thin shared writer for AgentLog — every real agent action (booking,
    reschedule, cancel, reminder sent, review requested, offer sent) records
    one row here so Owner/Receptionist-monitoring surfaces have a real audit
    trail to read from, instead of the table sitting permanently empty."""

    async def log(
        self,
        db: AsyncSession,
        practice_id: UUID,
        agent_type: str,
        action: str,
        details: dict | None = None,
        performed_by: str = "ai_agent",
    ) -> AgentLog:
        entry = AgentLog(
            practice_id=practice_id,
            agent_type=agent_type,
            action=action,
            details=details or {},
            performed_by=performed_by,
        )
        db.add(entry)
        await db.flush()
        return entry
