import hashlib
import hmac
import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Request, Header, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from uuid import UUID

from src.config import get_settings
from src.database import get_db
from src.server.exceptions import AppException
from src.models.pending_signup import PendingSignup
from src.models.user import User, UserRole
from src.models.doctor import Doctor

settings = get_settings()
logger = logging.getLogger("aesthetixai.webhooks")

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _verify_clerk_signature(payload: bytes, signature_header: str, secret: str) -> bool:
    """Verify Clerk webhook signature using HMAC-SHA256 (svix format)."""
    if not secret or not signature_header:
        return False
    try:
        parts = {}
        for item in signature_header.split(","):
            key, value = item.split("=", 1)
            parts[key] = value
        expected_sig = parts.get("v1", "")
        signed_payload = f"{parts.get('t', '')}.{payload.decode('utf-8')}"
        computed = hmac.new(
            secret.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        import base64
        computed_b64 = base64.b64encode(computed).decode("utf-8")
        return hmac.compare_digest(computed_b64, expected_sig)
    except Exception as e:
        logger.warning("Clerk signature verification failed: %s", e)
        return False


@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    svix_id: str = Header(default="", alias="svix-id"),
    svix_timestamp: str = Header(default="", alias="svix-timestamp"),
    svix_signature: str = Header(default="", alias="svix-signature"),
    db: AsyncSession = Depends(get_db),
):
    raw_body = await request.body()

    if settings.clerk_webhook_secret:
        signature_header = f"t={svix_timestamp},v1={svix_signature}"
        if not _verify_clerk_signature(raw_body, signature_header, settings.clerk_webhook_secret):
            raise AppException("Invalid Clerk webhook signature", status_code=400)

    payload = await request.json()
    event_type = payload.get("type")
    data = payload.get("data", {})
    clerk_user_id = data.get("id")

    if event_type == "user.created" and clerk_user_id:
        existing = await db.execute(select(User).where(User.clerk_id == clerk_user_id))
        if existing.scalar_one_or_none() is None:
            email_addresses = data.get("email_addresses", [])
            primary_email = next(
                (e["email_address"] for e in email_addresses if e.get("id") == data.get("primary_email_address_id")),
                email_addresses[0]["email_address"] if email_addresses else "",
            )
            name = data.get("first_name", "") + " " + data.get("last_name", "")
            phone = data.get("phone_numbers", [{}])[0].get("phone_number", "") if data.get("phone_numbers") else None
            public_metadata = data.get("public_metadata", {})
            unsafe_metadata = data.get("unsafe_metadata", {})
            invite_type = public_metadata.get("invite_type")
            self_apply_type = unsafe_metadata.get("invite_type")

            if self_apply_type == "doctor_self_apply" and unsafe_metadata.get("practice_id"):
                # Self-registration via a practice's shareable signup code
                # (see practice_router.py's GET /practice/validate-doctor-code
                # and frontend's DoctorApplyPage) — unsafe_metadata (set
                # client-side at Clerk sign-up) carries the resolved
                # practice_id, since there's no invite to stamp public_metadata
                # with ahead of time. Created inactive: this account can only
                # submit an application (see get_current_user_record in
                # dependencies.py) until an Owner reviews and approves it,
                # which is what flips is_active and creates the real Doctor row.
                new_user = User(
                    clerk_id=clerk_user_id,
                    practice_id=UUID(unsafe_metadata["practice_id"]),
                    email=primary_email,
                    name=name,
                    phone=phone,
                    role=UserRole.DOCTOR,
                    is_active=False,
                )
                db.add(new_user)
                await db.flush()
                logger.info("Created inactive self-applied Doctor User for clerk_id=%s", clerk_user_id)
            elif invite_type == "doctor" and public_metadata.get("practice_id"):
                # Invited via POST /api/v1/doctors/{id}/invite (ClerkService.invite_user) —
                # public_metadata carries the practice/doctor to link, since Clerk's JWT
                # has no signal about which practice a brand-new sign-up belongs to.
                new_user = User(
                    clerk_id=clerk_user_id,
                    practice_id=UUID(public_metadata["practice_id"]),
                    email=primary_email,
                    name=name,
                    phone=phone,
                    role=UserRole.DOCTOR,
                )
                db.add(new_user)
                await db.flush()

                doctor_id = public_metadata.get("doctor_id")
                if doctor_id:
                    doctor_result = await db.execute(select(Doctor).where(Doctor.id == UUID(doctor_id)))
                    doctor = doctor_result.scalar_one_or_none()
                    if doctor:
                        doctor.user_id = new_user.id
                        await db.flush()
                logger.info("Created Doctor User for clerk_id=%s, linked doctor_id=%s", clerk_user_id, doctor_id)
            else:
                new_user = User(
                    clerk_id=clerk_user_id,
                    email=primary_email,
                    name=name,
                    phone=phone,
                    role=UserRole.STAFF,
                )
                db.add(new_user)
                await db.flush()
                logger.info("Created User for clerk_id=%s", clerk_user_id)

    elif event_type == "user.updated" and clerk_user_id:
        result = await db.execute(select(User).where(User.clerk_id == clerk_user_id))
        user = result.scalar_one_or_none()
        if user:
            email_addresses = data.get("email_addresses", [])
            primary_email = next(
                (e["email_address"] for e in email_addresses if e.get("id") == data.get("primary_email_address_id")),
                email_addresses[0]["email_address"] if email_addresses else user.email,
            )
            user.email = primary_email
            user.name = (data.get("first_name", "") + " " + data.get("last_name", "")).strip() or user.name
            await db.flush()
            logger.info("Updated User for clerk_id=%s", clerk_user_id)

    elif event_type == "user.deleted" and clerk_user_id:
        result = await db.execute(select(User).where(User.clerk_id == clerk_user_id))
        user = result.scalar_one_or_none()
        if user:
            user.is_active = False
            await db.flush()
            logger.info("Deactivated User for clerk_id=%s", clerk_user_id)

    return {"received": True}


@router.post("/twilio/voice")
async def twilio_voice_webhook(request: Request):
    form = await request.form()
    return {"status": "received"}


@router.post("/twilio/sms")
async def twilio_sms_webhook(request: Request):
    form = await request.form()
    return {"status": "received"}


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    payload = await request.json()
    return {"status": "received"}


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(default="", alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    # Previously accepted any POST body as a genuine Stripe event with zero
    # verification — anyone could forge a "payment succeeded" call. Real
    # signature verification closes that.
    raw_body = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload=raw_body,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except (stripe.error.SignatureVerificationError, ValueError) as exc:
        raise AppException(f"Invalid Stripe webhook signature: {exc}", status_code=400)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        result = await db.execute(
            select(PendingSignup).where(PendingSignup.stripe_session_id == session["id"])
        )
        pending = result.scalar_one_or_none()
        if pending is not None:
            # Marks the checkout as paid. Provisioning the real Practice/
            # User/Subscription from this record is a deliberate follow-up —
            # see the NOTE in models/pending_signup.py for why a Subscription
            # row can't be written directly here yet.
            pending.completed_at = datetime.now(timezone.utc)
            await db.flush()

    return {"received": True}
