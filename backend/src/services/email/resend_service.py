from __future__ import annotations
import httpx

from src.config import get_settings

settings = get_settings()


class ResendService:
    """Sibling to EmailService (SendGrid), not a replacement — this project
    already keeps one class per external provider (TwilioService,
    WhatsAppService, etc.). Used for demo-request confirmation emails."""

    BASE_URL = "https://api.resend.com"

    def __init__(self):
        self.api_key = settings.resend_api_key
        self.from_email = settings.resend_from_email

    async def send(self, to: str, subject: str, html_content: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.BASE_URL}/emails",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": self.from_email,
                    "to": [to],
                    "subject": subject,
                    "html": html_content,
                },
            )
            resp.raise_for_status()
            return resp.json()
