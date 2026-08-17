from src.services.agent.recovery_dashboard.recovery_dashboard_service import RecoveryDashboardService


class RecoveryDashboardController:
    def __init__(self):
        self.service = RecoveryDashboardService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
