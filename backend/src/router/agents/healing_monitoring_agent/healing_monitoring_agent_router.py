from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.healing_monitoring_agent.healing_monitoring_agent_controllers import HealingMonitoringController

router = APIRouter(prefix="/agents/healing_monitoring", tags=["Healing Monitoring"])
controller = HealingMonitoringController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
