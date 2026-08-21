from src.services.agents.cost_estimation_agent.cost_estimation_agent_services import CostEstimationService


class CostEstimationController:
    def __init__(self):
        self.service = CostEstimationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
