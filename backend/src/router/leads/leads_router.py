from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.controller.leads.leads_controllers import LeadsController

router = APIRouter(tags=["Leads"])
controller = LeadsController()


@router.post("/leads/run-nurturing")
async def run_nurturing(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Manually trigger the same stale-lead check the background poller
    runs every 12 hours (see lead_nurturing_poller.py) — mainly for
    testing/on-demand use, scoped to the caller's own practice only."""
    return await controller.run_nurturing(db, user)
