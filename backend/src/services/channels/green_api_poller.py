from __future__ import annotations

import asyncio
import logging

from src.database import async_session_factory
from src.models.practice import Practice
from src.services.channels.inbound_service import InboundService
from src.services.channels.whatsapp_green_api import WhatsAppGreenAPI
from sqlalchemy import select

logger = logging.getLogger(__name__)

_INTERVAL_SECONDS = 3


class GreenAPIPoller:
    """Background poller that pulls incoming WhatsApp notifications from the
    Green API queue (HTTP polling — no public webhook URL required).

    Green API keeps incoming notifications in a queue for 24h. This poller
    calls `receiveNotification` every few seconds, processes each incoming
    text message via InboundService, then acknowledges it with
    `deleteNotification` so it isn't processed twice.
    """

    def __init__(self) -> None:
        self._tasks: list[asyncio.Task] = []
        # Checked once per instance per process lifetime, not every tick —
        # this is an extra API call, and the setting doesn't change on its
        # own once fixed.
        self._webhook_checked: set[str] = set()

    def start(self) -> None:
        self._tasks = [asyncio.create_task(self._poll(practice_id=None))]
        logger.info("Green API poller started")

    def stop(self) -> None:
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()

    async def _poll(self, practice_id=None) -> None:
        inbound = InboundService()
        while True:
            try:
                await self._tick(inbound)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Green API poller tick failed")
            await asyncio.sleep(_INTERVAL_SECONDS)

    async def _tick(self, inbound: InboundService) -> None:
        instances = await self._load_practice_instances()
        for instance_id, token in instances:
            wa = WhatsAppGreenAPI(instance_id, token)
            try:
                state = await wa.get_state()
            except Exception:
                logger.debug("Instance %s not reachable", instance_id)
                continue
            if state.get("stateInstance") != "authorized":
                continue

            if instance_id not in self._webhook_checked:
                try:
                    fixed = await wa.ensure_incoming_webhook_enabled()
                    if fixed:
                        logger.warning(
                            "Instance %s had incomingWebhook disabled (would have silently "
                            "dropped every incoming message) — enabled it now.",
                            instance_id,
                        )
                except Exception:
                    logger.exception("Failed to check/enable incomingWebhook for instance %s", instance_id)
                self._webhook_checked.add(instance_id)

            notification = await wa.receive_notification(timeout=5)
            while notification:
                receipt_id = notification.get("receiptId")
                body = notification.get("body") or {}
                try:
                    await self._process_notification(inbound, instance_id, body)
                except Exception:
                    logger.exception("Failed processing notification %s", receipt_id)
                if receipt_id is not None:
                    try:
                        await wa.delete_notification(int(receipt_id))
                    except Exception:
                        logger.warning("Failed to delete notification %s", receipt_id)
                notification = await wa.receive_notification(timeout=5)

    async def _load_practice_instances(self) -> list[tuple[str, str]]:
        """Load all confirmed Green API instances from practice settings."""
        async with async_session_factory() as db:
            result = await db.execute(select(Practice))
            instances = []
            for practice in result.scalars().all():
                ga = (practice.settings or {}).get("green_api", {})
                instance_id = ga.get("instance_id")
                token = ga.get("api_token")
                if instance_id and token:
                    instances.append((instance_id, token))
            return instances

    async def _process_notification(self, inbound: InboundService, instance_id: str, body: dict) -> None:
        if body.get("typeWebhook") != "incomingMessageReceived":
            return

        message_data = body.get("messageData", {})
        if message_data.get("typeMessage") != "textMessage":
            logger.info("Ignoring non-text message: %s", message_data.get("typeMessage"))
            return

        sender_data = body.get("senderData", {})
        phone = (sender_data.get("sender") or "").replace("@c.us", "").replace("@g.us", "")
        sender_name = sender_data.get("senderName", "Unknown")
        chat_id = sender_data.get("chatId", "")
        message_text = message_data.get("textMessageData", {}).get("textMessage", "")

        if not phone or not message_text:
            return

        phone_from_chat = chat_id.replace("@c.us", "").replace("@g.us", "") if chat_id else phone

        async with async_session_factory() as db:
            result = await inbound.handle_whatsapp_message(
                db=db,
                phone_number=phone_from_chat,
                sender_name=sender_name,
                message_text=message_text,
                instance_id=instance_id,
            )
            await db.commit()
            logger.info(
                "WhatsApp handled: %s -> %s (sent=%s)",
                phone_from_chat,
                (result.get("reply") or "")[:50],
                result.get("sent"),
            )
