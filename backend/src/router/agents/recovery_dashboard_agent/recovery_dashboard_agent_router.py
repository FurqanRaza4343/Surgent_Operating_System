from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.recovery_dashboard_agent.recovery_dashboard_agent_controllers import RecoveryDashboardController

router = APIRouter(prefix="/agents/recovery_dashboard", tags=["Recovery Dashboard"])
controller = RecoveryDashboardController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
