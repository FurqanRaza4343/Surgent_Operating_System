from src.services.agents.risk_assessment_agent.risk_assessment_agent_services import RiskAssessmentService


class RiskAssessmentController:
    def __init__(self):
        self.service = RiskAssessmentService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
