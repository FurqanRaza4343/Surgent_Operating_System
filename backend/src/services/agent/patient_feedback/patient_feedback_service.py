class PatientFeedbackService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "patient_feedback", "status": "active", "user": user.get("sub")}
