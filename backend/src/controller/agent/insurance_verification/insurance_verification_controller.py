from src.services.agent.insurance_verification.insurance_verification_service import InsuranceVerificationService


class InsuranceVerificationController:
    def __init__(self):
        self.service = InsuranceVerificationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
