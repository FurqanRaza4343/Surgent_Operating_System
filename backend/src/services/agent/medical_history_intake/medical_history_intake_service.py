class MedicalHistoryIntakeService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "medical_history_intake", "status": "active", "user": user.get("sub")}
