import stripe

from src.config import get_settings
from src.server.exceptions import AppException

settings = get_settings()

stripe.api_key = settings.stripe_secret_key


class PaymentService:
    async def create_checkout_session(
        self,
        price_id: str,
        practice_id: str,
        success_url: str,
        cancel_url: str,
        customer_email: str | None = None,
    ) -> dict:
        kwargs = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "client_reference_id": practice_id,
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        if customer_email:
            # Pricing-page checkouts happen before a practice/user record
            # exists (see PendingSignup) — Stripe still needs an email to
            # send its own receipt to and to pre-fill the Checkout page.
            kwargs["customer_email"] = customer_email
        try:
            session = stripe.checkout.Session.create(**kwargs)
        except stripe.error.StripeError as exc:
            # Placeholder STRIPE_SECRET_KEY/STRIPE_PRICE_* in .env until real
            # ones are set — a clean 503 instead of a raw 500 so this reads
            # as "not configured yet", not an unexpected server crash.
            raise AppException(
                "Payment processing isn't configured yet — Stripe hasn't been connected with real API keys.",
                status_code=503,
            ) from exc
        return {"session_id": session.id, "url": session.url}

    async def cancel_subscription(self, stripe_subscription_id: str) -> dict:
        subscription = stripe.Subscription.modify(stripe_subscription_id, cancel_at_period_end=True)
        return {"status": subscription.status, "current_period_end": subscription.current_period_end}
