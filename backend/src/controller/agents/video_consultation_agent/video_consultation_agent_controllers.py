from src.services.agents.video_consultation_agent.video_consultation_agent_services import VideoConsultationService


class VideoConsultationController:
    def __init__(self):
        self.service = VideoConsultationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
