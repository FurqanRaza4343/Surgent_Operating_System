from __future__ import annotations
from openai import AsyncOpenAI, RateLimitError

from src.config import get_settings

settings = get_settings()


class LLMService:
    # Mistral's chat completions endpoint is OpenAI-SDK compatible, so this
    # reuses the same client class pointed at a different base_url instead of
    # adding a second SDK dependency.
    MISTRAL_BASE_URL = "https://api.mistral.ai/v1"

    def __init__(self):
        self._openai_client = None
        self._mistral_client = None
        self.openai_model = settings.openai_model
        self.mistral_model = settings.mistral_model

    @property
    def openai_client(self):
        if self._openai_client is None:
            self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._openai_client

    @property
    def mistral_client(self):
        if self._mistral_client is None:
            self._mistral_client = AsyncOpenAI(
                api_key=settings.mistral_api_key, base_url=self.MISTRAL_BASE_URL
            )
        return self._mistral_client

    def _client_and_model(self, tier: str):
        # Matches the tiered strategy documented in system.md: low-stakes
        # traffic (FAQ, translation, general chat) rides Mistral's free tier;
        # high/critical-stakes traffic (risk assessment, payments, clinical
        # notes) always goes straight to OpenAI.
        if tier == "low" and settings.mistral_api_key:
            return self.mistral_client, self.mistral_model
        return self.openai_client, self.openai_model

    async def chat(
        self, messages: list[dict], system_prompt: str | None = None, tier: str = "high"
    ) -> str:
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        client, model = self._client_and_model(tier)
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=full_messages,
                temperature=0.7,
                max_tokens=1024,
            )
        except RateLimitError:
            if client is not self.openai_client:
                # Mistral free-tier limit hit — fall back to OpenAI rather
                # than surface an error for a low-stakes request.
                response = await self.openai_client.chat.completions.create(
                    model=self.openai_model,
                    messages=full_messages,
                    temperature=0.7,
                    max_tokens=1024,
                )
            else:
                raise

        return response.choices[0].message.content or ""

    async def chat_with_tools(
        self, messages: list[dict], tools: list[dict], system_prompt: str | None = None
    ) -> dict:
        # Tool-calling stays on OpenAI regardless of tier — it's always used
        # for actions (bookings, escalations), never low-stakes chat.
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        response = await self.openai_client.chat.completions.create(
            model=self.openai_model,
            messages=full_messages,
            tools=tools,
            temperature=0.7,
        )

        choice = response.choices[0]
        return {
            "content": choice.message.content or "",
            "tool_calls": choice.message.tool_calls,
        }
