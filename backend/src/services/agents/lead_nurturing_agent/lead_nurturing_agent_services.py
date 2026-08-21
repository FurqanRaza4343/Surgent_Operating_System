class LeadNurturingService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "lead_nurturing", "status": "active", "user": user.get("sub")}
