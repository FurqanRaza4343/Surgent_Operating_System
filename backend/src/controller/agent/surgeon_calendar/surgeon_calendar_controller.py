from src.services.agent.surgeon_calendar.surgeon_calendar_service import SurgeonCalendarService


class SurgeonCalendarController:
    def __init__(self):
        self.service = SurgeonCalendarService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
