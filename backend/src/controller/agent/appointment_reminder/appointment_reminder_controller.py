from src.services.agent.appointment_reminder.appointment_reminder_service import AppointmentReminderService


class AppointmentReminderController:
    def __init__(self):
        self.service = AppointmentReminderService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
