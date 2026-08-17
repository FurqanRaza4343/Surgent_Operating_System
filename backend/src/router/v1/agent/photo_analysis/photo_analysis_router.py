from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.photo_analysis.photo_analysis_controller import PhotoAnalysisController

router = APIRouter(prefix="/agents/photo_analysis", tags=["Photo Analysis"])
controller = PhotoAnalysisController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
