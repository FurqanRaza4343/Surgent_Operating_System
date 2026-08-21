from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.operating_room_scheduler_agent.operating_room_scheduler_agent_controllers import OperatingRoomSchedulerController

router = APIRouter(prefix="/agents/operating_room_scheduler", tags=["Operating Room Scheduler"])
controller = OperatingRoomSchedulerController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
