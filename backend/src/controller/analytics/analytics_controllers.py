from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.analytics import OverviewSummaryResponse, SessionAnalyticsResponse
from src.services.analytics.analytics_services import AnalyticsService


class AnalyticsController:
    def __init__(self):
        self.service = AnalyticsService()

    async def get_overview_summary(self, db: AsyncSession, user: User) -> OverviewSummaryResponse:
        return await self.service.get_overview_summary(db, user.practice_id)

    async def get_session_analytics(self, db: AsyncSession, user: User) -> SessionAnalyticsResponse:
        return await self.service.get_session_analytics(db, user.practice_id)
