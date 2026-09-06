from __future__ import annotations
import asyncio
import logging

from src.database import async_session_factory
from src.services.recovery.post_op_followup_service import PostOpFollowUpService

logger = logging.getLogger(__name__)

# Checked every 6 hours, not continuously — unlike GreenAPIPoller (which
# polls a real-time message queue every few seconds), this only ever needs
# to catch "did any surgery just cross a checkpoint day," which changes at
# most once a day per surgery. PostOpFollowUpService.check_and_send_followups
# is itself idempotent (see its own docstring), so running this on a loose
# cadence is safe — it just means a checkpoint gets caught within a few
# hours of actually falling due, not the instant midnight ticks over.
_INTERVAL_SECONDS = 6 * 60 * 60


class PostOpFollowUpPoller:
    def __init__(self):
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._loop())

    def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None

    async def _loop(self) -> None:
        service = PostOpFollowUpService()
        while True:
            try:
                async with async_session_factory() as db:
                    sent = await service.check_and_send_followups(db)
                    await db.commit()
                    if sent:
                        logger.info("Post-op follow-ups sent: %s", sent)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Post-op follow-up poller tick failed")
            await asyncio.sleep(_INTERVAL_SECONDS)
