class PhotoAnalysisService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "photo_analysis", "status": "active", "user": user.get("sub")}
