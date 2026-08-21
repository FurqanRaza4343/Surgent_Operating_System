from src.services.agents.marketing_followup_agent.marketing_followup_agent_services import MarketingFollowupService


class MarketingFollowupController:
    def __init__(self):
        self.service = MarketingFollowupService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
