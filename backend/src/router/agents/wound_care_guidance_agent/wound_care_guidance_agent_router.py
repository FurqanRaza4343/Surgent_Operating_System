from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.wound_care_guidance_agent.wound_care_guidance_agent_controllers import WoundCareGuidanceController

router = APIRouter(prefix="/agents/wound_care_guidance", tags=["Wound Care Guidance"])
controller = WoundCareGuidanceController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
