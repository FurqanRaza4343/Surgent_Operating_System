class RiskAssessmentService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "risk_assessment", "status": "active", "user": user.get("sub")}
