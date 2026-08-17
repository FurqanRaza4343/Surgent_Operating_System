from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.implant_inventory.implant_inventory_controller import ImplantInventoryController

router = APIRouter(prefix="/agents/implant_inventory", tags=["Implant Inventory"])
controller = ImplantInventoryController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
