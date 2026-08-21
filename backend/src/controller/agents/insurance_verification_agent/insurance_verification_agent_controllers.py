from src.services.agents.insurance_verification_agent.insurance_verification_agent_services import InsuranceVerificationService


class InsuranceVerificationController:
    def __init__(self):
        self.service = InsuranceVerificationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
