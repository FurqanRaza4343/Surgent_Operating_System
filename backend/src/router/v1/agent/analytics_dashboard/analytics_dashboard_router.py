from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.analytics_dashboard.analytics_dashboard_controller import AnalyticsDashboardController

router = APIRouter(prefix="/agents/analytics_dashboard", tags=["Analytics Dashboard"])
controller = AnalyticsDashboardController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
