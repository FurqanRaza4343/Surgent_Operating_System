from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.risk_assessment.risk_assessment_controller import RiskAssessmentController

router = APIRouter(prefix="/agents/risk_assessment", tags=["Risk Assessment"])
controller = RiskAssessmentController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
