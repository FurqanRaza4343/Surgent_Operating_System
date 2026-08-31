from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.analytics import OverviewSummaryResponse, SessionAnalyticsResponse
from src.controller.analytics.analytics_controllers import AnalyticsController

router = APIRouter(prefix="/analytics", tags=["Analytics"])
controller = AnalyticsController()


@router.get("/overview", response_model=OverviewSummaryResponse)
async def get_overview_summary(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_overview_summary(db, user)


@router.get("/sessions", response_model=SessionAnalyticsResponse)
async def get_session_analytics(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_session_analytics(db, user)
