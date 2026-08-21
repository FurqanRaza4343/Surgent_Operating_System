class InsuranceVerificationService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "insurance_verification", "status": "active", "user": user.get("sub")}
