class RecoveryFollowupService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "recovery_followup", "status": "active", "user": user.get("sub")}
