class ProcedureRecommendationService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "procedure_recommendation", "status": "active", "user": user.get("sub")}
