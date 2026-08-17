from src.services.agent.medication_reminder.medication_reminder_service import MedicationReminderService


class MedicationReminderController:
    def __init__(self):
        self.service = MedicationReminderService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
