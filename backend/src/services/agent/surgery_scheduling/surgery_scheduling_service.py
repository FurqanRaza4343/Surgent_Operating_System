class SurgerySchedulingService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "surgery_scheduling", "status": "active", "user": user.get("sub")}
