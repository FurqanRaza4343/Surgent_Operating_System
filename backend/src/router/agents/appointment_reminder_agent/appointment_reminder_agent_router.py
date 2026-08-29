from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_user, get_current_practice_user
from src.models.user import User
from src.controller.agents.appointment_reminder_agent.appointment_reminder_agent_controllers import AppointmentReminderController

router = APIRouter(prefix="/agents/appointment_reminder", tags=["Appointment Reminder"])
controller = AppointmentReminderController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)


@router.post("/send/{appointment_id}")
async def send_reminder(
    appointment_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.send_reminder(db, user, appointment_id)
