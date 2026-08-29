from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.plan import PlanResponse
from src.services.admin.plan_services import PlanService

# No auth — same justification as GET /agent-costing: current pricing is
# platform info, not practice-sensitive, and both the public pricing page
# and the dashboard's own plan-gating (usePlanTier.ts) need this before any
# practice-auth chain necessarily exists.
router = APIRouter(prefix="/plans", tags=["Plans"])
service = PlanService()


@router.get("", response_model=list[PlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    plans = await service.list_plans(db, include_inactive=False)
    return [PlanResponse.from_model(p) for p in plans]
