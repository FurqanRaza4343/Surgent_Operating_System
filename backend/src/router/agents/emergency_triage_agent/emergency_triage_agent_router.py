from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.emergency_triage_agent.emergency_triage_agent_controllers import EmergencyTriageController

router = APIRouter(prefix="/agents/emergency_triage", tags=["Emergency Triage"])
controller = EmergencyTriageController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
