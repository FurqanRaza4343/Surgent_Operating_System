from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.wound_care_guidance.wound_care_guidance_controller import WoundCareGuidanceController

router = APIRouter(prefix="/agents/wound_care_guidance", tags=["Wound Care Guidance"])
controller = WoundCareGuidanceController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
