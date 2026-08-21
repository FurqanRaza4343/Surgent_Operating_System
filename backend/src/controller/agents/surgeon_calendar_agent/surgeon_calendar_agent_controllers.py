from src.services.agents.surgeon_calendar_agent.surgeon_calendar_agent_services import SurgeonCalendarService


class SurgeonCalendarController:
    def __init__(self):
        self.service = SurgeonCalendarService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
