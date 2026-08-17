from __future__ import annotations
from src.services.llm.llm_service import LLMService
from src.services.twilio.twilio_service import TwilioService


class ReceptionistService:
    def __init__(self):
        self.llm = LLMService()
        self.twilio = TwilioService()

    async def handle_call(self, user: dict) -> dict:
        response_text = await self.llm.chat(
            messages=[{"role": "user", "content": "A patient is calling. Greet them warmly."}],
            system_prompt="You are a warm, professional AI receptionist for an aesthetic medicine practice. Answer calls politely, collect patient name and reason for call, and offer to book a consultation.",
        )
        twiml = self.twilio.generate_twiml_response(response_text)
        return {"response": response_text, "twiml": twiml}

    async def transcribe_audio(self, user: dict) -> dict:
        return {"transcription": "", "status": "not_implemented"}

    async def process_message(self, message: str, conversation_id: str | None = None) -> str:
        response = await self.llm.chat(
            messages=[{"role": "user", "content": message}],
            system_prompt="You are an AI receptionist for an aesthetic practice. Be helpful, warm, and professional.",
        )
        return response
