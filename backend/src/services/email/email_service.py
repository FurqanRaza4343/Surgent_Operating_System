import sendgrid
from sendgrid.helpers.mail import Mail

from src.config import get_settings

settings = get_settings()


class EmailService:
    def __init__(self):
        self.client = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        self.from_email = settings.email_from

    def send(self, to: str, subject: str, html_content: str) -> dict:
        message = Mail(
            from_email=self.from_email,
            to_emails=to,
            subject=subject,
            html_content=html_content,
        )
        response = self.client.send(message)
        return {"status_code": response.status_code, "headers": dict(response.headers)}
