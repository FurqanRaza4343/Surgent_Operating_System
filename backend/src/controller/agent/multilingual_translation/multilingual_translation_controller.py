from src.services.agent.multilingual_translation.multilingual_translation_service import MultilingualTranslationService


class MultilingualTranslationController:
    def __init__(self):
        self.service = MultilingualTranslationService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
