import httpx

from src.config import get_settings

settings = get_settings()


class InstagramService:
    def __init__(self):
        self.api_token = settings.whatsapp_api_token

    async def send_message(self, recipient_id: str, text: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://graph.facebook.com/v18.0/me/messages",
                params={"access_token": self.api_token},
                json={
                    "recipient": {"id": recipient_id},
                    "message": {"text": text},
                },
            )
            return resp.json()
