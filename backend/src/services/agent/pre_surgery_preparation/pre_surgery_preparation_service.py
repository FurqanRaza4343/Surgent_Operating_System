class PreSurgeryPreparationService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "pre_surgery_preparation", "status": "active", "user": user.get("sub")}
