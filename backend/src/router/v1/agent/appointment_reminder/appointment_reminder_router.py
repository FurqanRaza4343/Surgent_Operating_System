from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.appointment_reminder.appointment_reminder_controller import AppointmentReminderController

router = APIRouter(prefix="/agents/appointment_reminder", tags=["Appointment Reminder"])
controller = AppointmentReminderController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
