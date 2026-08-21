from src.services.agents.ai_consultation_agent.ai_consultation_agent_services import AIConsultationService


class AIConsultationController:
    def __init__(self):
        self.service = AIConsultationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
