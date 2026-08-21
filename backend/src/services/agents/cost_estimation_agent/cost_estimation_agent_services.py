class CostEstimationService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "cost_estimation", "status": "active", "user": user.get("sub")}
