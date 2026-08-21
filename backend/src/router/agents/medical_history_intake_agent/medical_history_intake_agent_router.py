from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.medical_history_intake_agent.medical_history_intake_agent_controllers import MedicalHistoryIntakeController

router = APIRouter(prefix="/agents/medical_history_intake", tags=["Medical History Intake"])
controller = MedicalHistoryIntakeController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
