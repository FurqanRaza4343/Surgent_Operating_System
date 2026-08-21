class EmergencyTriageService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "emergency_triage", "status": "active", "user": user.get("sub")}
