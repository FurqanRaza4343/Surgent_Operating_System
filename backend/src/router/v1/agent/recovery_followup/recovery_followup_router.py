from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.recovery_followup.recovery_followup_controller import RecoveryFollowupController

router = APIRouter(prefix="/agents/recovery_followup", tags=["Recovery Follow-up"])
controller = RecoveryFollowupController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
