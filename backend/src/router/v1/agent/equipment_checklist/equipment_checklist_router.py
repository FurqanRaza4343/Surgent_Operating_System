from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.equipment_checklist.equipment_checklist_controller import EquipmentChecklistController

router = APIRouter(prefix="/agents/equipment_checklist", tags=["Equipment Checklist"])
controller = EquipmentChecklistController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
