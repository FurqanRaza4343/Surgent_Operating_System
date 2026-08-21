from src.services.agents.operating_room_scheduler_agent.operating_room_scheduler_agent_services import OperatingRoomSchedulerService


class OperatingRoomSchedulerController:
    def __init__(self):
        self.service = OperatingRoomSchedulerService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
