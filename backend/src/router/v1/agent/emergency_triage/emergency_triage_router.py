from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.emergency_triage.emergency_triage_controller import EmergencyTriageController

router = APIRouter(prefix="/agents/emergency_triage", tags=["Emergency Triage"])
controller = EmergencyTriageController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
