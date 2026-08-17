from src.services.agent.marketing_followup.marketing_followup_service import MarketingFollowupService


class MarketingFollowupController:
    def __init__(self):
        self.service = MarketingFollowupService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
