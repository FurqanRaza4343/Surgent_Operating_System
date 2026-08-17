from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.surgeon_calendar.surgeon_calendar_controller import SurgeonCalendarController

router = APIRouter(prefix="/agents/surgeon_calendar", tags=["Surgeon Calendar"])
controller = SurgeonCalendarController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
