from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.reschedule_cancellation.reschedule_cancellation_controller import RescheduleCancellationController

router = APIRouter(prefix="/agents/reschedule_cancellation", tags=["Reschedule Cancellation"])
controller = RescheduleCancellationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
