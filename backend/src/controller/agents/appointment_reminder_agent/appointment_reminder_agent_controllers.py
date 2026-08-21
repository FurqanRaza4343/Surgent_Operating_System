from src.services.agents.appointment_reminder_agent.appointment_reminder_agent_services import AppointmentReminderService


class AppointmentReminderController:
    def __init__(self):
        self.service = AppointmentReminderService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
