from src.services.agent.appointment_booking.appointment_booking_service import AppointmentBookingService


class AppointmentBookingController:
    def __init__(self):
        self.service = AppointmentBookingService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
