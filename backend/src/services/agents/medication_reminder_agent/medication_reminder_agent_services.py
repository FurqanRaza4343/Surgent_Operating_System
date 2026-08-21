class MedicationReminderService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "medication_reminder", "status": "active", "user": user.get("sub")}
