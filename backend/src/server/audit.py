from __future__ import annotations
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.server.dependencies import get_current_practice_user
from src.services.audit.audit_log_service import AuditLogService

audit_log_service = AuditLogService()


def _resource_id_from_path(request: Request, id_param: str | None) -> UUID | None:
    if not id_param:
        return None
    raw = request.path_params.get(id_param)
    if not raw:
        return None
    try:
        return UUID(str(raw))
    except ValueError:
        return None


def audit_action(action: str, resource_type: str | None = None, id_param: str | None = None):
    """Dependency factory — a drop-in replacement for
    `Depends(get_current_practice_user)` on any router endpoint that also
    records a real AuditLog row, added mechanically at the router level
    instead of hand-written per endpoint (matching how require_role/
    require_plan_feature already work in this file's sibling
    dependencies.py). `id_param` names the path parameter holding the
    resource's id, when there is one — e.g. `audit_action("patient.view",
    "patient", id_param="patient_id")` on a `/patients/{patient_id}` route.

    Usage: swap
        user: User = Depends(get_current_practice_user)
    for
        user: User = Depends(audit_action("patient.view", "patient", id_param="patient_id"))
    — same auth guarantee, plus one audit row per call."""

    async def _check(
        request: Request,
        local_user: User = Depends(get_current_practice_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        await audit_log_service.log(
            db,
            practice_id=local_user.practice_id,
            actor_type="user",
            action=action,
            actor_user_id=local_user.id,
            resource_type=resource_type,
            resource_id=_resource_id_from_path(request, id_param),
            ip_address=request.client.host if request.client else None,
        )
        return local_user

    return _check


def audit_log_only(action: str, resource_type: str | None = None, id_param: str | None = None):
    """Like audit_action, but doesn't itself gate access — for endpoints
    that already use a stricter dependency (e.g. require_role(...)) for
    auth and just need an audit row added alongside it. Declare both on the
    same endpoint: `user: User = Depends(require_role(...))` for the auth
    check, `_audit: None = Depends(audit_log_only(...))` for the log entry
    — FastAPI dedupes the shared get_current_practice_user() call between
    them within one request, so this doesn't re-run the Clerk lookup."""

    async def _check(
        request: Request,
        local_user: User = Depends(get_current_practice_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        await audit_log_service.log(
            db,
            practice_id=local_user.practice_id,
            actor_type="user",
            action=action,
            actor_user_id=local_user.id,
            resource_type=resource_type,
            resource_id=_resource_id_from_path(request, id_param),
            ip_address=request.client.host if request.client else None,
        )

    return _check
