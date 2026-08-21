from src.services.agents.wound_care_guidance_agent.wound_care_guidance_agent_services import WoundCareGuidanceService


class WoundCareGuidanceController:
    def __init__(self):
        self.service = WoundCareGuidanceService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
