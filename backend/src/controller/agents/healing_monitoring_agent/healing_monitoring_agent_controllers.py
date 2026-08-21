from src.services.agents.healing_monitoring_agent.healing_monitoring_agent_services import HealingMonitoringService


class HealingMonitoringController:
    def __init__(self):
        self.service = HealingMonitoringService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
