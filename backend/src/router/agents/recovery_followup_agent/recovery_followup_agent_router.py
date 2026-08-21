from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.recovery_followup_agent.recovery_followup_agent_controllers import RecoveryFollowupController

router = APIRouter(prefix="/agents/recovery_followup", tags=["Recovery Follow-up"])
controller = RecoveryFollowupController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
