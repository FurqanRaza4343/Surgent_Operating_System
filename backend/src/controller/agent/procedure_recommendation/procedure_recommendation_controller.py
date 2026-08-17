from src.services.agent.procedure_recommendation.procedure_recommendation_service import ProcedureRecommendationService


class ProcedureRecommendationController:
    def __init__(self):
        self.service = ProcedureRecommendationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
