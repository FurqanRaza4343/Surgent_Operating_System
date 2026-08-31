from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.services.llm.llm_service import LLMService
from src.services.agent_log.agent_log_service import AgentLogService


class TranslationService:
    """Real translation — the old multilingual_translation_agent had no
    implementation at all (a bare status stub). LLMService.chat()'s tier="low"
    routing was already documented as intended for exactly this kind of
    low-stakes traffic, just never wired up. Logged as
    `agent_type="ai_receptionist"`."""

    def __init__(self):
        self.llm = LLMService()
        self.agent_log = AgentLogService()

    async def translate(self, db: AsyncSession, practice_id: UUID, text: str, target_language: str, performed_by: str) -> str:
        translated = await self.llm.chat(
            messages=[{"role": "user", "content": text}],
            system_prompt=(
                f"Translate the user's message into {target_language}. "
                "Reply with ONLY the translation — no explanation, no quotes, no original text."
            ),
            tier="low",
        )
        await self.agent_log.log(
            db, practice_id, agent_type="ai_receptionist", action="message_translated",
            details={"target_language": target_language, "source_preview": text[:200]}, performed_by=performed_by,
        )
        return translated.strip()
