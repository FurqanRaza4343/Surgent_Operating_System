from src.services.agent.risk_assessment.risk_assessment_service import RiskAssessmentService


class RiskAssessmentController:
    def __init__(self):
        self.service = RiskAssessmentService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
