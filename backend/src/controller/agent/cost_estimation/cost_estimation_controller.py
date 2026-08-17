from src.services.agent.cost_estimation.cost_estimation_service import CostEstimationService


class CostEstimationController:
    def __init__(self):
        self.service = CostEstimationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
