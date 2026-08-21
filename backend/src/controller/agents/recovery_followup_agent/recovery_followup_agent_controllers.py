from src.services.agents.recovery_followup_agent.recovery_followup_agent_services import RecoveryFollowupService


class RecoveryFollowupController:
    def __init__(self):
        self.service = RecoveryFollowupService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
