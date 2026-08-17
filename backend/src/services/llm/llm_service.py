from __future__ import annotations
from openai import AsyncOpenAI

from src.config import get_settings

settings = get_settings()


class LLMService:
    def __init__(self):
        self._client = None
        self.model = settings.openai_model

    @property
    def client(self):
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    async def chat(self, messages: list[dict], system_prompt: str | None = None) -> str:
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=0.7,
            max_tokens=1024,
        )

        return response.choices[0].message.content or ""

    async def chat_with_tools(self, messages: list[dict], tools: list[dict], system_prompt: str | None = None) -> dict:
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            tools=tools,
            temperature=0.7,
        )

        choice = response.choices[0]
        return {
            "content": choice.message.content or "",
            "tool_calls": choice.message.tool_calls,
        }
