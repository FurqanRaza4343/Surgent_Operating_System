from src.services.agents.pre_surgery_preparation_agent.pre_surgery_preparation_agent_services import PreSurgeryPreparationService


class PreSurgeryPreparationController:
    def __init__(self):
        self.service = PreSurgeryPreparationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
