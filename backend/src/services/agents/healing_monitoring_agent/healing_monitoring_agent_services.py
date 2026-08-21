class HealingMonitoringService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "healing_monitoring", "status": "active", "user": user.get("sub")}
