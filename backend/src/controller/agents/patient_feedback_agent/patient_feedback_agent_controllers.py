from src.services.agents.patient_feedback_agent.patient_feedback_agent_services import PatientFeedbackService


class PatientFeedbackController:
    def __init__(self):
        self.service = PatientFeedbackService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
