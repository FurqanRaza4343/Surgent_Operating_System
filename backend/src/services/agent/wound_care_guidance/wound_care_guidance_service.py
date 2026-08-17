class WoundCareGuidanceService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "wound_care_guidance", "status": "active", "user": user.get("sub")}
