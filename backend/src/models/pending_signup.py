import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

# NOTE(read before touching): the Stripe webhook (checkout.session.completed)
# still only stamps `completed_at` here, NOT a `Subscription`/`Practice` row —
# Subscription.practice_id is NOT NULL and no Practice exists yet at webhook
# time (Stripe fires this server-side, before the customer has ever created a
# Clerk account). Provisioning happens at claim time instead, once a real
# Clerk identity exists — see services/checkout/provisioning_service.py and
# router/practice/practice_router.py's POST /practice/claim.


class PendingSignup(Base):
    """A Pricing-page checkout, from Stripe payment through to claiming a
    real account. `completed_at` is set by the Stripe webhook (payment
    succeeded). `claimed_at`/`claimed_by_clerk_id`/`practice_id` are set by
    POST /practice/claim once the customer has created a Clerk account and
    provisioning has run — see provisioning_service.py."""

    __tablename__ = "pending_signups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_tier: Mapped[str] = mapped_column(String(50), nullable=False)
    stripe_session_id: Mapped[str] = mapped_column(String(255), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_by_clerk_id: Mapped[str] = mapped_column(String(255), nullable=True)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
