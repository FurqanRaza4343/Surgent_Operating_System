from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse

from src.config import get_settings

settings = get_settings()


class TwilioService:
    def __init__(self):
        self.client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        self.phone_number = settings.twilio_phone_number

    def make_call(self, to: str, twiml_url: str) -> dict:
        call = self.client.calls.create(
            to=to,
            from_=self.phone_number,
            url=twiml_url,
        )
        return {"call_sid": call.sid, "status": call.status}

    def send_sms(self, to: str, message: str) -> dict:
        msg = self.client.messages.create(
            body=message,
            from_=self.phone_number,
            to=to,
        )
        return {"message_sid": msg.sid, "status": msg.status}

    @staticmethod
    def generate_twiml_response(text: str) -> str:
        resp = VoiceResponse()
        resp.say(text, voice="Polly.Joanna-Neural")
        return str(resp)
