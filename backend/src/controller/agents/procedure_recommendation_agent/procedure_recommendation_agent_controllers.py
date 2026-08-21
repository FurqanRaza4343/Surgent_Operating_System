from src.services.agents.procedure_recommendation_agent.procedure_recommendation_agent_services import ProcedureRecommendationService


class ProcedureRecommendationController:
    def __init__(self):
        self.service = ProcedureRecommendationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
