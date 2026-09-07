from __future__ import annotations
import logging
import secrets

import redis.asyncio as redis

from src.config import get_settings
from src.server.exceptions import AppException

settings = get_settings()
logger = logging.getLogger(__name__)

_TTL_SECONDS = 10 * 60
_CODE_LENGTH = 6


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())


class PatientOtpStore:
    """Redis-backed one-time login code for the Patient Portal — replaces
    the old static portal PIN (see patient_portal_auth_service.py). A code
    is single-use (deleted on successful verify) and expires on its own, so
    unlike the rate limiter this fails CLOSED on a Redis outage: a rate
    limiter blocking real logins is worse than the brute-force risk it
    guards against, but an OTP store that lets everyone in when its backing
    store is unreachable is a straightforward auth bypass — the opposite
    tradeoff applies here."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = redis.from_url(settings.redis_url, decode_responses=True)
        return self._client

    def _key(self, phone: str) -> str:
        return f"patient_otp:{_normalize_phone(phone)}"

    async def generate(self, phone: str) -> str:
        code = "".join(str(secrets.randbelow(10)) for _ in range(_CODE_LENGTH))
        try:
            await self.client.set(self._key(phone), code, ex=_TTL_SECONDS)
        except Exception as exc:
            logger.exception("Failed to store OTP for phone lookup")
            raise AppException("Couldn't generate a login code right now — try again shortly.") from exc
        return code

    async def verify(self, phone: str, code: str) -> bool:
        key = self._key(phone)
        try:
            stored = await self.client.get(key)
        except Exception as exc:
            logger.exception("Failed to read OTP during verification")
            raise AppException("Couldn't verify your code right now — try again shortly.") from exc
        if stored is None or not secrets.compare_digest(stored, code.strip()):
            return False
        try:
            await self.client.delete(key)
        except Exception:
            logger.warning("OTP verified but failed to delete from Redis — a replay is possible until TTL expiry")
        return True
