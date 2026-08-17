from src.services.agent.analytics_dashboard.analytics_dashboard_service import AnalyticsDashboardService


class AnalyticsDashboardController:
    def __init__(self):
        self.service = AnalyticsDashboardService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
