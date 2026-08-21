from src.services.agents.appointment_booking_agent.appointment_booking_agent_services import AppointmentBookingService


class AppointmentBookingController:
    def __init__(self):
        self.service = AppointmentBookingService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
