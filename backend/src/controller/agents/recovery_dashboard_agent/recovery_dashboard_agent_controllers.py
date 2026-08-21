from src.services.agents.recovery_dashboard_agent.recovery_dashboard_agent_services import RecoveryDashboardService


class RecoveryDashboardController:
    def __init__(self):
        self.service = RecoveryDashboardService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
