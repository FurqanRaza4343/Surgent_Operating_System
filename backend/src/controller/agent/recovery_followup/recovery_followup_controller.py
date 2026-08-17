from src.services.agent.recovery_followup.recovery_followup_service import RecoveryFollowupService


class RecoveryFollowupController:
    def __init__(self):
        self.service = RecoveryFollowupService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
