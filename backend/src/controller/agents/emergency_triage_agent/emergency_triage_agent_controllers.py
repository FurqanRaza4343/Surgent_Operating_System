from src.services.agents.emergency_triage_agent.emergency_triage_agent_services import EmergencyTriageService


class EmergencyTriageController:
    def __init__(self):
        self.service = EmergencyTriageService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
