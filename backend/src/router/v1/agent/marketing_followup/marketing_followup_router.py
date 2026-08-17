from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.marketing_followup.marketing_followup_controller import MarketingFollowupController

router = APIRouter(prefix="/agents/marketing_followup", tags=["Marketing Follow-up"])
controller = MarketingFollowupController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
