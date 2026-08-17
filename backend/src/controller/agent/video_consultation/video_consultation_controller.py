from src.services.agent.video_consultation.video_consultation_service import VideoConsultationService


class VideoConsultationController:
    def __init__(self):
        self.service = VideoConsultationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
