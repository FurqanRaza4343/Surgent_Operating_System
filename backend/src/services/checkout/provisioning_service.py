from __future__ import annotations
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.pending_signup import PendingSignup
from src.models.practice import Practice
from src.models.user import User
from src.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from src.models.agent_config import AgentConfig
from src.services.practice.plan_capabilities import allowed_agent_slugs
from src.server.exceptions import AppException


class ProvisioningService:
    """Turns a paid PendingSignup + a real Clerk identity into a real
    Practice/User/Subscription. Called from POST /practice/claim once the
    customer has created their Clerk account — NOT from the Stripe webhook,
    which fires before any Clerk account exists (see the NOTE in
    models/pending_signup.py).

    Idempotent at every step: re-claiming the same session, or a repeat
    buyer whose email already has a Practice (Practice.email is UNIQUE),
    attaches to the existing records instead of erroring or duplicating.
    """

    async def provision_from_pending_signup(
        self,
        db: AsyncSession,
        pending: PendingSignup,
        clerk_id: str,
        clerk_email: str | None,
        clerk_name: str | None,
    ) -> Practice:
        if not pending.completed_at:
            raise AppException("This checkout session hasn't been paid yet.", status_code=400)

        # Already claimed (by this or another request) — idempotent return.
        if pending.practice_id:
            practice = await db.get(Practice, pending.practice_id)
            if practice:
                return practice

        practice = await self._get_or_create_practice(db, pending, clerk_name)
        await self._get_or_create_owner_user(db, practice, clerk_id, clerk_email, pending.email)
        subscription = await self._get_or_create_subscription(db, practice, pending.plan_tier)
        await self._seed_agent_configs(db, practice, subscription.tier)

        pending.practice_id = practice.id
        pending.claimed_at = datetime.now(timezone.utc)
        pending.claimed_by_clerk_id = clerk_id
        await db.flush()

        return practice

    async def _get_or_create_practice(self, db: AsyncSession, pending: PendingSignup, clerk_name: str | None) -> Practice:
        result = await db.execute(select(Practice).where(Practice.email == pending.email))
        practice = result.scalar_one_or_none()
        if practice:
            return practice

        default_name = f"{clerk_name}'s Practice" if clerk_name else pending.email.split("@")[0].title()
        practice = Practice(id=uuid.uuid4(), name=default_name, email=pending.email)
        db.add(practice)
        await db.flush()
        return practice

    async def _get_or_create_owner_user(
        self, db: AsyncSession, practice: Practice, clerk_id: str, clerk_email: str | None, fallback_email: str
    ) -> User:
        result = await db.execute(select(User).where(User.clerk_id == clerk_id))
        user = result.scalar_one_or_none()
        if user:
            return user

        user = User(
            id=uuid.uuid4(),
            practice_id=practice.id,
            clerk_id=clerk_id,
            email=clerk_email or fallback_email,
            role="owner",
        )
        db.add(user)
        await db.flush()
        return user

    async def _get_or_create_subscription(self, db: AsyncSession, practice: Practice, plan_tier: str) -> Subscription:
        result = await db.execute(
            select(Subscription)
            .where(Subscription.practice_id == practice.id)
            .where(Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]))
        )
        existing = result.scalars().first()
        if existing:
            return existing

        subscription = Subscription(
            id=uuid.uuid4(),
            practice_id=practice.id,
            tier=SubscriptionTier(plan_tier),
            # 14-day free trial, not an immediate charge — see checkout_services.py's
            # trial_period_days once real Stripe keys are configured.
            status=SubscriptionStatus.TRIAL,
            start_date=date.today(),
        )
        db.add(subscription)
        await db.flush()
        return subscription

    async def _seed_agent_configs(self, db: AsyncSession, practice: Practice, tier: SubscriptionTier) -> None:
        allowed = allowed_agent_slugs(tier)
        result = await db.execute(select(AgentConfig.agent_type).where(AgentConfig.practice_id == practice.id))
        existing_slugs = {row[0] for row in result.all()}
        for slug in allowed - existing_slugs:
            db.add(AgentConfig(id=uuid.uuid4(), practice_id=practice.id, agent_type=slug, enabled=True))
        await db.flush()
