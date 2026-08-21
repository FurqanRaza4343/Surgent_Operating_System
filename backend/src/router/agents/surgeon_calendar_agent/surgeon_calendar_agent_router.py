from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.surgeon_calendar_agent.surgeon_calendar_agent_controllers import SurgeonCalendarController

router = APIRouter(prefix="/agents/surgeon_calendar", tags=["Surgeon Calendar"])
controller = SurgeonCalendarController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
