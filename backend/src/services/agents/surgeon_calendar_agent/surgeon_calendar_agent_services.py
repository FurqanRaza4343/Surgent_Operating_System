class SurgeonCalendarService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "surgeon_calendar", "status": "active", "user": user.get("sub")}
