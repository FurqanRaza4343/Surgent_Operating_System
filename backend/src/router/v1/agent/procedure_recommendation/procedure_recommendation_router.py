from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.procedure_recommendation.procedure_recommendation_controller import ProcedureRecommendationController

router = APIRouter(prefix="/agents/procedure_recommendation", tags=["Procedure Recommendation"])
controller = ProcedureRecommendationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
