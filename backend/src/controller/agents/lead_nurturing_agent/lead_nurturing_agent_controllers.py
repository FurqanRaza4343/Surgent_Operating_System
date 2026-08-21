from src.services.agents.lead_nurturing_agent.lead_nurturing_agent_services import LeadNurturingService


class LeadNurturingController:
    def __init__(self):
        self.service = LeadNurturingService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
