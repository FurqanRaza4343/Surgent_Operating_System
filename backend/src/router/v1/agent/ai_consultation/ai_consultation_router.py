from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.ai_consultation.ai_consultation_controller import AIConsultationController

router = APIRouter(prefix="/agents/ai_consultation", tags=["AI Consultation"])
controller = AIConsultationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
