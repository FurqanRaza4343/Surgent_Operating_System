from src.services.agents.surgery_scheduling_agent.surgery_scheduling_agent_services import SurgerySchedulingService


class SurgerySchedulingController:
    def __init__(self):
        self.service = SurgerySchedulingService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
