from __future__ import annotations
import logging
import random
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.patient import Patient
from src.models.practice import Practice
from src.server.exceptions import NotFoundException, UnauthorizedException, AppException
from src.services.audit.audit_log_service import AuditLogService
from src.services.security.rate_limiter import RedisRateLimiter
from src.services.patient_portal.patient_otp_store import PatientOtpStore
from src.services.channels.whatsapp_green_api import WhatsAppGreenAPI
from src.services.email.resend_service import ResendService

settings = get_settings()
logger = logging.getLogger(__name__)
audit_log_service = AuditLogService()

# Separate limiters for the two steps: requesting a code (guards against
# spamming a patient's phone with OTP messages / enumerating which phones
# have an account) and verifying one (guards against brute-forcing a
# 6-digit code within its 10-minute window).
request_rate_limiter = RedisRateLimiter(max_attempts=5, window_seconds=15 * 60)
verify_rate_limiter = RedisRateLimiter(max_attempts=8, window_seconds=15 * 60)


class PatientPortalAuthService:
    """Patient-facing login — phone number + a one-time code, replacing the
    earlier static portal_id + PIN scheme entirely. A clinic-assigned PIN
    was a shared secret staff had to generate, hand over, and could in
    principle read/store; a code sent live to the patient's own verified
    phone (falling back to email when WhatsApp isn't reachable — see
    _deliver_code) is a real possession-based factor tied to a channel
    only the patient controls, and there's nothing durable for staff to
    mishandle. portal_id is kept only as a human-readable reference clinic
    staff can quote back to a patient (see system_design.md) — it plays no
    role in authentication anymore."""

    def __init__(self):
        self.otp_store = PatientOtpStore()

    async def _find_patients_by_phone(self, db: AsyncSession, phone: str) -> list[Patient]:
        digits = "".join(ch for ch in phone if ch.isdigit())
        result = await db.execute(select(Patient).where(Patient.portal_enabled == True))  # noqa: E712
        return [p for p in result.scalars().all() if p.phone and "".join(ch for ch in p.phone if ch.isdigit()).endswith(digits[-10:])]

    async def _deliver_code(self, db: AsyncSession, patient: Patient, code: str) -> str:
        """Tries WhatsApp first (matches how this patient most likely
        already talks to the clinic), falls back to email if WhatsApp isn't
        configured/reachable or the patient has no WhatsApp identity on
        file. Raises if neither channel is available — there's no silent
        "looks sent but wasn't" path here, unlike the messaging bugs found
        earlier this project: a login code that didn't actually go out must
        surface as a real error, not a false success."""
        text = f"Your Aiaceone verification code is {code}. It expires in 10 minutes. Don't share this with anyone."

        result = await db.execute(select(Practice).where(Practice.id == patient.practice_id))
        practice = result.scalar_one_or_none()
        ga = WhatsAppGreenAPI.from_practice_settings((practice.settings if practice else None) or {})
        if ga is not None and patient.phone:
            try:
                send_result = await ga.send_text(patient.phone, text)
                if "idMessage" in send_result:
                    return "whatsapp"
                logger.warning("WhatsApp OTP send for patient %s did not return an idMessage: %s", patient.id, send_result)
            except Exception:
                logger.exception("WhatsApp OTP delivery failed for patient %s, falling back to email", patient.id)

        if patient.email:
            try:
                await ResendService().send(
                    patient.email, "Your Aiaceone verification code",
                    f"<p>Your verification code is <strong>{code}</strong>. It expires in 10 minutes.</p>",
                )
                return "email"
            except Exception:
                logger.exception("Email OTP delivery failed for patient %s", patient.id)

        raise AppException("Couldn't deliver a login code — no working WhatsApp or email on file. Please contact the clinic.")

    async def request_otp(self, db: AsyncSession, phone: str, client_key: str, ip_address: str | None = None) -> dict:
        await request_rate_limiter.check(client_key)
        candidates = await self._find_patients_by_phone(db, phone)

        if not candidates:
            await audit_log_service.log(db, None, "patient_portal", "otp_request.no_account", ip_address=ip_address)
            await db.commit()
            return {"found": False, "delivered_via": None}

        # Same phone matching more than one portal-enabled patient (rare —
        # different practices, or a duplicate record) — the newest profile
        # is the most likely one the patient actually means to reach.
        patient = max(candidates, key=lambda p: p.updated_at)
        code = await self.otp_store.generate(patient.phone)
        delivered_via = await self._deliver_code(db, patient, code)

        await audit_log_service.log(
            db, patient.practice_id, "patient_portal", "otp_request.sent",
            resource_type="patient", resource_id=patient.id, ip_address=ip_address,
        )
        await db.commit()
        return {"found": True, "delivered_via": delivered_via}

    async def verify_otp(self, db: AsyncSession, phone: str, code: str, client_key: str, ip_address: str | None = None) -> tuple[str, Patient]:
        await verify_rate_limiter.check(client_key)
        candidates = await self._find_patients_by_phone(db, phone)
        if not candidates:
            raise UnauthorizedException("Invalid phone number or code")
        patient = max(candidates, key=lambda p: p.updated_at)

        if not await self.otp_store.verify(patient.phone, code):
            await audit_log_service.log(
                db, patient.practice_id, "patient_portal", "portal_login.failed",
                resource_type="patient", resource_id=patient.id, ip_address=ip_address,
            )
            await db.commit()
            raise UnauthorizedException("Invalid or expired code")

        await verify_rate_limiter.reset(client_key)
        await audit_log_service.log(
            db, patient.practice_id, "patient_portal", "portal_login.success",
            resource_type="patient", resource_id=patient.id, ip_address=ip_address,
        )
        await db.commit()
        token = self._issue_token(patient)
        return token, patient

    # --- Staff-side portal management -------------------------------------

    async def _get_practice_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> Patient:
        result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")
        return patient

    async def _generate_unique_portal_id(self, db: AsyncSession) -> str:
        year = datetime.now(timezone.utc).year
        for _ in range(10):
            candidate = f"PT-{year}-{random.randint(0, 99999):05d}"
            existing = await db.execute(select(Patient.id).where(Patient.portal_id == candidate))
            if existing.scalar_one_or_none() is None:
                return candidate
        raise AppException("Could not generate a unique patient ID — try again.")

    async def enable_portal(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> tuple[str, bool]:
        """Turns portal access on (generating a reference patient ID if this
        patient doesn't have one yet) and sends an invite over WhatsApp/
        email so they know to log in with their own phone number — no PIN
        for staff to generate or hand over anymore. Returns
        (portal_id, invite_sent)."""
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        if not patient.portal_id:
            patient.portal_id = await self._generate_unique_portal_id(db)
        patient.portal_enabled = True
        await db.flush()

        invite_sent = False
        if patient.phone or patient.email:
            try:
                await self._send_invite(db, patient)
                invite_sent = True
            except Exception:
                logger.exception("Portal invite send failed for patient %s — access is enabled regardless", patient.id)
        return patient.portal_id, invite_sent

    async def resend_invite(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> bool:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        if not patient.portal_enabled:
            raise AppException("Portal isn't enabled for this patient yet — enable it first.")
        await self._send_invite(db, patient)
        return True

    async def _send_invite(self, db: AsyncSession, patient: Patient) -> None:
        text = (
            f"Hi {patient.first_name}, your Aiaceone patient portal is ready. "
            f"Visit the portal and enter this phone number to get a login code. Your reference ID is {patient.portal_id}."
        )
        result = await db.execute(select(Practice).where(Practice.id == patient.practice_id))
        practice = result.scalar_one_or_none()
        ga = WhatsAppGreenAPI.from_practice_settings((practice.settings if practice else None) or {})
        if ga is not None and patient.phone:
            send_result = await ga.send_text(patient.phone, text)
            if "idMessage" in send_result:
                return
        if patient.email:
            await ResendService().send(patient.email, "Your Aiaceone patient portal is ready", f"<p>{text}</p>")
            return
        raise AppException("No working WhatsApp or email on file to send the invite.")

    async def disable_portal(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> None:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        patient.portal_enabled = False
        await db.flush()

    async def get_portal_state(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> tuple[str | None, bool]:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        return patient.portal_id, patient.portal_enabled

    # --- Token issuance / verification -------------------------------------

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
        try:
            payload = jwt.decode(token, settings.patient_portal_jwt_secret, algorithms=["HS256"])
        except jwt.PyJWTError:
            raise UnauthorizedException("Invalid or expired session — please log in again")
        if payload.get("type") != "patient_portal":
            raise UnauthorizedException("Invalid session token")
        return UUID(payload["sub"])
