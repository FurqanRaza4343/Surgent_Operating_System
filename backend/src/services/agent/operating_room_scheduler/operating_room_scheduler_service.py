class OperatingRoomSchedulerService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "operating_room_scheduler", "status": "active", "user": user.get("sub")}
