class MarketingFollowupService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "marketing_followup", "status": "active", "user": user.get("sub")}
