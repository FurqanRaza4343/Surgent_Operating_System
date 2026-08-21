from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.implant_inventory_agent.implant_inventory_agent_controllers import ImplantInventoryController

router = APIRouter(prefix="/agents/implant_inventory", tags=["Implant Inventory"])
controller = ImplantInventoryController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
