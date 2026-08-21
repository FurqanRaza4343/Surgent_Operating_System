from src.services.agents.multilingual_translation_agent.multilingual_translation_agent_services import MultilingualTranslationService


class MultilingualTranslationController:
    def __init__(self):
        self.service = MultilingualTranslationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
