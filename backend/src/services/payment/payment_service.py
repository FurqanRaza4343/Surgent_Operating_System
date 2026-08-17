import stripe

from src.config import get_settings

settings = get_settings()

stripe.api_key = settings.stripe_secret_key


class PaymentService:
    async def create_checkout_session(self, price_id: str, practice_id: str, success_url: str, cancel_url: str) -> dict:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            client_reference_id=practice_id,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return {"session_id": session.id, "url": session.url}

    async def cancel_subscription(self, stripe_subscription_id: str) -> dict:
        subscription = stripe.Subscription.modify(stripe_subscription_id, cancel_at_period_end=True)
        return {"status": subscription.status, "current_period_end": subscription.current_period_end}
