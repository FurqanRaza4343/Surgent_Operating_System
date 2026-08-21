from src.services.agents.reschedule_cancellation_agent.reschedule_cancellation_agent_services import RescheduleCancellationService


class RescheduleCancellationController:
    def __init__(self):
        self.service = RescheduleCancellationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
