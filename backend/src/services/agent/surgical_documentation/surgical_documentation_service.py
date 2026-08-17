class SurgicalDocumentationService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "surgical_documentation", "status": "active", "user": user.get("sub")}
