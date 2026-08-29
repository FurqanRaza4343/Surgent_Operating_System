from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.review_request import ReviewRequestResponse
from src.services.agents.patient_feedback_agent.patient_feedback_agent_services import PatientFeedbackService


class PatientFeedbackController:
    def __init__(self):
        self.service = PatientFeedbackService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)

    async def request_review(self, db: AsyncSession, user: User, appointment_id: UUID) -> ReviewRequestResponse:
        review_request = await self.service.request_review(db, user.practice_id, appointment_id)
        return ReviewRequestResponse.model_validate(review_request)
