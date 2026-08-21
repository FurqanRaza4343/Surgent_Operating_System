from src.services.agents.medication_reminder_agent.medication_reminder_agent_services import MedicationReminderService


class MedicationReminderController:
    def __init__(self):
        self.service = MedicationReminderService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
