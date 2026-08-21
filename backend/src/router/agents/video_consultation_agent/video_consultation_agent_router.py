from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.video_consultation_agent.video_consultation_agent_controllers import VideoConsultationController

router = APIRouter(prefix="/agents/video_consultation", tags=["Video Consultation"])
controller = VideoConsultationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
