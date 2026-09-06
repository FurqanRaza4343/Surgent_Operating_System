from __future__ import annotations
import asyncio
import logging

from src.database import async_session_factory
from src.services.leads.lead_nurturing_service import LeadNurturingService

logger = logging.getLogger(__name__)

# Same reasoning as PostOpFollowUpPoller: a lead going stale is a slow,
# day-granularity event, not something that needs near-real-time polling —
# checked every 12 hours. check_and_send_nurtures is itself idempotent
# (cooldown + cap tracked via past message history), so a loose cadence
# only affects how promptly a newly-stale lead gets caught, never correctness.
_INTERVAL_SECONDS = 12 * 60 * 60


class LeadNurturingPoller:
    def __init__(self):
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._loop())

    def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None

    async def _loop(self) -> None:
        service = LeadNurturingService()
        while True:
            try:
                async with async_session_factory() as db:
                    sent = await service.check_and_send_nurtures(db)
                    await db.commit()
                    if sent:
                        logger.info("Lead nurture messages sent: %s", sent)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Lead nurturing poller tick failed")
            await asyncio.sleep(_INTERVAL_SECONDS)
