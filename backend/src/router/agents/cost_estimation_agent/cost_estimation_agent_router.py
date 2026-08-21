from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.cost_estimation_agent.cost_estimation_agent_controllers import CostEstimationController

router = APIRouter(prefix="/agents/cost_estimation", tags=["Cost Estimation"])
controller = CostEstimationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
