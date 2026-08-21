from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.equipment_checklist_agent.equipment_checklist_agent_controllers import EquipmentChecklistController

router = APIRouter(prefix="/agents/equipment_checklist", tags=["Equipment Checklist"])
controller = EquipmentChecklistController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
