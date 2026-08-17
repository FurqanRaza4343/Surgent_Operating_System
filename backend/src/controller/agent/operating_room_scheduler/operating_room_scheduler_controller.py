from src.services.agent.operating_room_scheduler.operating_room_scheduler_service import OperatingRoomSchedulerService


class OperatingRoomSchedulerController:
    def __init__(self):
        self.service = OperatingRoomSchedulerService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
