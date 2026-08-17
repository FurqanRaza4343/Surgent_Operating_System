from src.services.agent.surgical_documentation.surgical_documentation_service import SurgicalDocumentationService


class SurgicalDocumentationController:
    def __init__(self):
        self.service = SurgicalDocumentationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
