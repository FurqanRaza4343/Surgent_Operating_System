from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.appointment_booking_agent.appointment_booking_agent_controllers import AppointmentBookingController

router = APIRouter(prefix="/agents/appointment_booking", tags=["Appointment Booking"])
controller = AppointmentBookingController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
