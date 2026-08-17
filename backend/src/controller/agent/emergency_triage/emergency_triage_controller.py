from src.services.agent.emergency_triage.emergency_triage_service import EmergencyTriageService


class EmergencyTriageController:
    def __init__(self):
        self.service = EmergencyTriageService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
