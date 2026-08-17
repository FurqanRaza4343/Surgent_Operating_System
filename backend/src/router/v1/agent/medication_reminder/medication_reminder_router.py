from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.medication_reminder.medication_reminder_controller import MedicationReminderController

router = APIRouter(prefix="/agents/medication_reminder", tags=["Medication Reminder"])
controller = MedicationReminderController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
