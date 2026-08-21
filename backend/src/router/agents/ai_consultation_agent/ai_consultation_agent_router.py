from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.ai_consultation_agent.ai_consultation_agent_controllers import AIConsultationController

router = APIRouter(prefix="/agents/ai_consultation", tags=["AI Consultation"])
controller = AIConsultationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
