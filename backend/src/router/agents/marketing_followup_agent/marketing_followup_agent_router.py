from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_user, get_current_practice_user
from src.models.user import User
from src.controller.agents.marketing_followup_agent.marketing_followup_agent_controllers import MarketingFollowupController

router = APIRouter(prefix="/agents/marketing_followup", tags=["Marketing Follow-up"])
controller = MarketingFollowupController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)


@router.post("/send-offer/{patient_id}")
async def send_offer(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.send_offer(db, user, patient_id)
