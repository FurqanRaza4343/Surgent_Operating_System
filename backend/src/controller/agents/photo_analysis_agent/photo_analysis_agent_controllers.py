from src.services.agents.photo_analysis_agent.photo_analysis_agent_services import PhotoAnalysisService


class PhotoAnalysisController:
    def __init__(self):
        self.service = PhotoAnalysisService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
