from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.lead_nurturing_agent.lead_nurturing_agent_controllers import LeadNurturingController

router = APIRouter(prefix="/agents/lead_nurturing", tags=["Lead Nurturing"])
controller = LeadNurturingController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
