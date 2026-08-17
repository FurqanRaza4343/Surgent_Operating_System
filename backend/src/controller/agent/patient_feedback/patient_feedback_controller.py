from src.services.agent.patient_feedback.patient_feedback_service import PatientFeedbackService


class PatientFeedbackController:
    def __init__(self):
        self.service = PatientFeedbackService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
