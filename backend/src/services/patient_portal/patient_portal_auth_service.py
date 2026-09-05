from __future__ import annotations
import random
import secrets
import time
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.patient import Patient
from src.server.exceptions import NotFoundException, UnauthorizedException, AppException

settings = get_settings()

_PIN_LENGTH = 6


class _InMemoryRateLimiter:
    """Per-process, in-memory only — fine for this month's local/dev-only
    deployment target (see system_design.md's hosting decision). A real
    multi-worker/production deployment must swap this for a shared store
    (Redis is already in this project's stack, unused today) since each
    worker process would otherwise track its own separate counts."""

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = {}

    def check(self, key: str) -> None:
        now = time.time()
        recent = [t for t in self._attempts.get(key, []) if now - t < self.window_seconds]
        if len(recent) >= self.max_attempts:
            raise AppException(
                f"Too many attempts — try again in a few minutes.", status_code=429
            )
        recent.append(now)
        self._attempts[key] = recent

    def reset(self, key: str) -> None:
        self._attempts.pop(key, None)


# Module-level singleton — intentional, mirrors the "one process, one
# in-memory cache" scope this limiter is designed for.
login_rate_limiter = _InMemoryRateLimiter(max_attempts=5, window_seconds=15 * 60)


class PatientPortalAuthService:
    """Patient-facing login — a human-readable portal_id + a PIN, hashed
    with bcrypt. Deliberately separate from Clerk (see system_design.md
    §4.4) and from the admin JWT secret (a leaked patient-portal secret
    should never also compromise the admin panel)."""

    async def _get_practice_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> Patient:
        result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")
        return patient

    async def _generate_unique_portal_id(self, db: AsyncSession) -> str:
        year = datetime.now(timezone.utc).year
        for _ in range(10):
            candidate = f"AP-{year}-{random.randint(0, 99999):05d}"
            existing = await db.execute(select(Patient.id).where(Patient.portal_id == candidate))
            if existing.scalar_one_or_none() is None:
                return candidate
        # Astronomically unlikely with a 5-digit space, but fail loudly
        # rather than silently return a colliding ID.
        raise AppException("Could not generate a unique portal ID — try again.")

    def _generate_pin(self) -> str:
        return "".join(str(secrets.randbelow(10)) for _ in range(_PIN_LENGTH))

    async def enable_portal(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> tuple[str, str]:
        """Turns portal access on, generating a portal_id if this patient
        doesn't have one yet, and always issuing a fresh PIN. Returns
        (portal_id, plaintext_pin) — the plaintext PIN is returned exactly
        once, for staff to hand to the patient; it is never stored or logged."""
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        if not patient.portal_id:
            patient.portal_id = await self._generate_unique_portal_id(db)

        pin = self._generate_pin()
        patient.portal_pin_hash = bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()
        patient.portal_enabled = True
        await db.flush()
        return patient.portal_id, pin

    async def reset_pin(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> str:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        if not patient.portal_id:
            raise AppException("Portal isn't enabled for this patient yet — enable it first.")
        pin = self._generate_pin()
        patient.portal_pin_hash = bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()
        await db.flush()
        return pin

    async def disable_portal(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> None:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        patient.portal_enabled = False
        await db.flush()

    async def get_portal_state(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> tuple[str | None, bool]:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        return patient.portal_id, patient.portal_enabled

    async def login(self, db: AsyncSession, portal_id: str, pin: str, client_key: str) -> tuple[str, Patient]:
        """Verifies portal_id+pin and returns (jwt, patient). Rate-limited
        per client_key (caller passes something like the requester's IP +
        the portal_id being attempted) to slow both PIN brute-forcing and
        portal_id enumeration."""
        login_rate_limiter.check(client_key)

        result = await db.execute(select(Patient).where(Patient.portal_id == portal_id))
        patient = result.scalar_one_or_none()

        # Same generic failure for "no such ID," "portal disabled," and
        # "wrong PIN" — never tell an attacker which part was wrong.
        if patient is None or not patient.portal_enabled or not patient.portal_pin_hash:
            raise UnauthorizedException("Invalid portal ID or PIN")
        if not bcrypt.checkpw(pin.encode(), patient.portal_pin_hash.encode()):
            raise UnauthorizedException("Invalid portal ID or PIN")

        login_rate_limiter.reset(client_key)
        token = self._issue_token(patient)
        return token, patient

    def _issue_token(self, patient: Patient) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(patient.id),
            "practice_id": str(patient.practice_id),
            "type": "patient_portal",
            "iat": now,
            "exp": now + timedelta(minutes=settings.patient_portal_jwt_expires_minutes),
        }
        return jwt.encode(payload, settings.patient_portal_jwt_secret, algorithm="HS256")

    def verify_token(self, token: str) -> UUID:
        """Returns the patient_id encoded in a valid token, or raises."""
        try:
            payload = jwt.decode(token, settings.patient_portal_jwt_secret, algorithms=["HS256"])
        except jwt.PyJWTError:
            raise UnauthorizedException("Invalid or expired session — please log in again")
        if payload.get("type") != "patient_portal":
            raise UnauthorizedException("Invalid session token")
        return UUID(payload["sub"])
