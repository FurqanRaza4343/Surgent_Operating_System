from src.services.agent.wound_care_guidance.wound_care_guidance_service import WoundCareGuidanceService


class WoundCareGuidanceController:
    def __init__(self):
        self.service = WoundCareGuidanceService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
