from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.surgery_scheduling_agent.surgery_scheduling_agent_controllers import SurgerySchedulingController

router = APIRouter(prefix="/agents/surgery_scheduling", tags=["Surgery Scheduling"])
controller = SurgerySchedulingController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
