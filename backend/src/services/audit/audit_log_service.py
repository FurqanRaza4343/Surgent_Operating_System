from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.audit_log import AuditLog


class AuditLogService:
    """Thin shared writer for AuditLog — mirrors AgentLogService's own
    pattern exactly (see services/agent_log/agent_log_service.py), kept as
    its own module with no dependency on server/dependencies.py so that
    both the FastAPI-dependency-based callers (server/audit.py) and
    plain service-layer callers (e.g. patient_portal_auth_service.py,
    which itself gets imported BY server/dependencies.py) can both import
    this without a circular import."""

    async def log(
        self,
        db: AsyncSession,
        practice_id: UUID | None,
        actor_type: str,
        action: str,
        actor_user_id: UUID | None = None,
        resource_type: str | None = None,
        resource_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            practice_id=practice_id,
            actor_user_id=actor_user_id,
            actor_type=actor_type,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
        )
        db.add(entry)
        await db.flush()
        return entry
