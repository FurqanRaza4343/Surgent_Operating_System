from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_user, get_current_practice_user
from src.models.user import User
from src.schemas.review_request import ReviewRequestResponse
from src.controller.agents.patient_feedback_agent.patient_feedback_agent_controllers import PatientFeedbackController

router = APIRouter(prefix="/agents/patient_feedback", tags=["Patient Feedback"])
controller = PatientFeedbackController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)


@router.post("/request-review/{appointment_id}", response_model=ReviewRequestResponse)
async def request_review(
    appointment_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.request_review(db, user, appointment_id)
