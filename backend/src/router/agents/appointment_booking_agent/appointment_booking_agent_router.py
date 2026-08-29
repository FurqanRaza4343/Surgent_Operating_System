from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_user, get_current_practice_user
from src.models.user import User
from src.schemas.appointment import AppointmentResponse, CreateAppointmentRequest
from src.controller.agents.appointment_booking_agent.appointment_booking_agent_controllers import AppointmentBookingController

router = APIRouter(prefix="/agents/appointment_booking", tags=["Appointment Booking"])
controller = AppointmentBookingController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)


@router.post("/book", response_model=AppointmentResponse)
async def book_appointment(
    data: CreateAppointmentRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.book(db, user, data)
