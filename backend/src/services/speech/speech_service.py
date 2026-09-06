from __future__ import annotations

from openai import AsyncOpenAI

from src.config import get_settings

settings = get_settings()


class SpeechService:
    """Speech-to-text via Groq's hosted Whisper endpoint. Groq's audio
    transcription API is OpenAI-SDK compatible (same client class as
    LLMService uses for Mistral/Groq chat, pointed at Groq's base_url), so
    no new SDK dependency — just another `AsyncOpenAI` client.

    Used for: AI Receptionist call transcription (once a real Twilio number
    is configured — TWILIO_ACCOUNT_SID/TWILIO_PHONE_NUMBER are still
    placeholders as of this writing, so nothing calls this from a live phone
    call yet) and, more immediately usable, doctor voice-dictation for
    consultation notes.
    """

    GROQ_BASE_URL = "https://api.groq.com/openai/v1"

    def __init__(self):
        self._client = None
        self.model = "whisper-large-v3-turbo"

    @property
    def client(self):
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=self.GROQ_BASE_URL)
        return self._client

    @property
    def is_configured(self) -> bool:
        return bool(settings.groq_api_key)

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.wav", language: str | None = None) -> str:
        """Transcribes audio to text. `filename`'s extension tells the API
        the audio format (wav/mp3/m4a/ogg/webm all supported) — the bytes
        themselves carry no format metadata over this API."""
        response = await self.client.audio.transcriptions.create(
            model=self.model,
            file=(filename, audio_bytes),
            language=language,
        )
        return response.text
