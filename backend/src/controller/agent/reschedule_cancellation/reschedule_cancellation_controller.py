from src.services.agent.reschedule_cancellation.reschedule_cancellation_service import RescheduleCancellationService


class RescheduleCancellationController:
    def __init__(self):
        self.service = RescheduleCancellationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
