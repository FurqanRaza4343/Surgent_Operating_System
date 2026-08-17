from src.services.agent.surgery_scheduling.surgery_scheduling_service import SurgerySchedulingService


class SurgerySchedulingController:
    def __init__(self):
        self.service = SurgerySchedulingService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
