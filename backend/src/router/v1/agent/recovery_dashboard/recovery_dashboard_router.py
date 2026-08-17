from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.recovery_dashboard.recovery_dashboard_controller import RecoveryDashboardController

router = APIRouter(prefix="/agents/recovery_dashboard", tags=["Recovery Dashboard"])
controller = RecoveryDashboardController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
