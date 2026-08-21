from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.medication_reminder_agent.medication_reminder_agent_controllers import MedicationReminderController

router = APIRouter(prefix="/agents/medication_reminder", tags=["Medication Reminder"])
controller = MedicationReminderController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
