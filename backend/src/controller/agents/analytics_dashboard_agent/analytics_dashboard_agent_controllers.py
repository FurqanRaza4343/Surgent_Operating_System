from src.services.agents.analytics_dashboard_agent.analytics_dashboard_agent_services import AnalyticsDashboardService


class AnalyticsDashboardController:
    def __init__(self):
        self.service = AnalyticsDashboardService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
