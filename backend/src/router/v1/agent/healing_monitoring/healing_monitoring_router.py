from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.healing_monitoring.healing_monitoring_controller import HealingMonitoringController

router = APIRouter(prefix="/agents/healing_monitoring", tags=["Healing Monitoring"])
controller = HealingMonitoringController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
