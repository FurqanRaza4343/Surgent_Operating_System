from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.patient_feedback.patient_feedback_controller import PatientFeedbackController

router = APIRouter(prefix="/agents/patient_feedback", tags=["Patient Feedback"])
controller = PatientFeedbackController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
