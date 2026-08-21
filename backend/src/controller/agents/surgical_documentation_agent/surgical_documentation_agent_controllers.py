from src.services.agents.surgical_documentation_agent.surgical_documentation_agent_services import SurgicalDocumentationService


class SurgicalDocumentationController:
    def __init__(self):
        self.service = SurgicalDocumentationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
