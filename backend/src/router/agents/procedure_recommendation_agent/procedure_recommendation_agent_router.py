from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.procedure_recommendation_agent.procedure_recommendation_agent_controllers import ProcedureRecommendationController

router = APIRouter(prefix="/agents/procedure_recommendation", tags=["Procedure Recommendation"])
controller = ProcedureRecommendationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
