class RescheduleCancellationService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "reschedule_cancellation", "status": "active", "user": user.get("sub")}
