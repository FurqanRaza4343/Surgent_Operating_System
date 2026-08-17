from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.lead_nurturing.lead_nurturing_controller import LeadNurturingController

router = APIRouter(prefix="/agents/lead_nurturing", tags=["Lead Nurturing"])
controller = LeadNurturingController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
