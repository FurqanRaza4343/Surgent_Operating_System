from src.services.agent.medical_history_intake.medical_history_intake_service import MedicalHistoryIntakeService


class MedicalHistoryIntakeController:
    def __init__(self):
        self.service = MedicalHistoryIntakeService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
