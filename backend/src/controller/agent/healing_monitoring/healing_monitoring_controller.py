from src.services.agent.healing_monitoring.healing_monitoring_service import HealingMonitoringService


class HealingMonitoringController:
    def __init__(self):
        self.service = HealingMonitoringService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
