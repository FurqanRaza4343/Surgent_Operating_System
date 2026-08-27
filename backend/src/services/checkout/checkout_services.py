from __future__ import annotations
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.pending_signup import PendingSignup
from src.services.payment.payment_service import PaymentService
from src.server.exceptions import AppException, NotFoundException

settings = get_settings()

PLAN_PRICE_IDS = {
    "solo": settings.stripe_price_solo,
    "practice": settings.stripe_price_practice,
}


class CheckoutService:
    def __init__(self):
        self.payment = PaymentService()

    def _stripe_configured(self) -> bool:
        # backend/.env ships literal "xxxx" placeholders until real keys are
        # added — see .env.example. Once a real sk_/price_ id is set this
        # flips false-positive-free and the demo bypass below stops firing.
        key_ok = bool(settings.stripe_secret_key) and "xxxx" not in settings.stripe_secret_key
        price_ok = all(pid and "xxxx" not in pid for pid in PLAN_PRICE_IDS.values())
        return key_ok and price_ok

    async def create_checkout_session(self, db: AsyncSession, email: str, plan_tier: str) -> str:
        if plan_tier not in PLAN_PRICE_IDS:
            raise AppException(f"Unknown or unsupported plan tier: {plan_tier}")

        pending = PendingSignup(id=uuid.uuid4(), email=email, plan_tier=plan_tier)
        db.add(pending)
        await db.flush()

        if not self._stripe_configured():
            return await self._demo_checkout(db, pending, plan_tier, email)

        session = await self.payment.create_checkout_session(
            price_id=PLAN_PRICE_IDS[plan_tier],
            practice_id=str(pending.id),  # client_reference_id — see PendingSignup's docstring
            # plan_tier/email are static values known before redirect (not
            # Stripe template fields) — carried so /pricing/success can show
            # the right plan immediately without an extra round trip.
            success_url=f"{settings.frontend_url}/pricing/success?session_id={{CHECKOUT_SESSION_ID}}&plan_tier={plan_tier}&email={email}",
            cancel_url=f"{settings.frontend_url}/pricing/cancel",
            customer_email=email,
        )
        pending.stripe_session_id = session["session_id"]
        await db.flush()
        return session["url"]

    async def _demo_checkout(self, db: AsyncSession, pending: PendingSignup, plan_tier: str, email: str) -> str:
        # DEMO MODE — no real Stripe keys configured yet (backend/.env's
        # STRIPE_SECRET_KEY/STRIPE_PRICE_* are still "xxxx" placeholders).
        # Does NOT mark the signup paid here — redirects to our own
        # Stripe-Checkout-styled demo payment page instead (frontend
        # app/onboarding/DemoPaymentPage.tsx), which is what calls
        # confirm_demo_payment() below on "Pay". This is a deliberate,
        # explicit decision for pre-launch demoing (a real card-entry-shaped
        # step, not a skip-straight-to-success shortcut), not a security
        # bypass on a live product — _stripe_configured() automatically stops
        # matching (and this whole branch stops firing) the moment real keys
        # are set; nothing else needs to change.
        pending.stripe_session_id = f"demo_{pending.id}"
        await db.flush()
        return f"{settings.frontend_url}/pricing/pay?session_id={pending.stripe_session_id}&plan_tier={plan_tier}&email={email}"

    async def confirm_demo_payment(self, db: AsyncSession, session_id: str) -> dict:
        if self._stripe_configured():
            # Real Stripe is connected — this endpoint must never be usable
            # to fake a payment once real charges are possible.
            raise AppException("Demo payment confirmation is disabled once real Stripe keys are configured.", status_code=403)

        result = await db.execute(select(PendingSignup).where(PendingSignup.stripe_session_id == session_id))
        pending = result.scalar_one_or_none()
        if pending is None:
            raise NotFoundException("No checkout session found for that id.")

        if pending.completed_at is None:
            pending.completed_at = datetime.now(timezone.utc)
            await db.flush()

        return {"paid": True, "plan_tier": pending.plan_tier, "email": pending.email, "claimed": pending.claimed_at is not None}

    async def get_session_status(self, db: AsyncSession, session_id: str) -> dict:
        result = await db.execute(select(PendingSignup).where(PendingSignup.stripe_session_id == session_id))
        pending = result.scalar_one_or_none()
        if pending is None:
            raise NotFoundException("No checkout session found for that id.")
        return {
            "paid": pending.completed_at is not None,
            "plan_tier": pending.plan_tier,
            "email": pending.email,
            "claimed": pending.claimed_at is not None,
        }
