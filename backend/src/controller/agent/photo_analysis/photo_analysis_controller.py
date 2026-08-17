from src.services.agent.photo_analysis.photo_analysis_service import PhotoAnalysisService


class PhotoAnalysisController:
    def __init__(self):
        self.service = PhotoAnalysisService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
