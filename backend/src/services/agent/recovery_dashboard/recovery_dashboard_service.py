class RecoveryDashboardService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "recovery_dashboard", "status": "active", "user": user.get("sub")}
