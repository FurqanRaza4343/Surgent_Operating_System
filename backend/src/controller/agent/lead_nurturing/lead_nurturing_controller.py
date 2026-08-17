from src.services.agent.lead_nurturing.lead_nurturing_service import LeadNurturingService


class LeadNurturingController:
    def __init__(self):
        self.service = LeadNurturingService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
