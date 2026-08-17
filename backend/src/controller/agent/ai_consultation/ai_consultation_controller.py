from src.services.agent.ai_consultation.ai_consultation_service import AIConsultationService


class AIConsultationController:
    def __init__(self):
        self.service = AIConsultationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
