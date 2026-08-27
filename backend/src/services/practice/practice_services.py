from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.practice import Practice
from src.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from src.models.user import User


class PracticeService:
    async def active_subscription_for(self, db: AsyncSession, practice_id) -> Subscription | None:
        # Practice.subscriptions has no "current" convenience accessor — a
        # practice can accumulate historical rows (cancelled, expired), so
        # pick the most recent non-cancelled/expired one explicitly rather
        # than trusting list order.
        result = await db.execute(
            select(Subscription)
            .where(Subscription.practice_id == practice_id)
            .where(Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]))
            .order_by(Subscription.created_at.desc())
        )
        return result.scalars().first()

    async def tier_for(self, db: AsyncSession, practice_id) -> SubscriptionTier:
        sub = await self.active_subscription_for(db, practice_id)
        return sub.tier if sub else SubscriptionTier.SOLO

    async def get_practice(self, db: AsyncSession, practice_id) -> Practice | None:
        result = await db.execute(select(Practice).where(Practice.id == practice_id))
        return result.scalar_one_or_none()

    async def update_practice(self, db: AsyncSession, practice: Practice, **fields) -> Practice:
        for key, value in fields.items():
            if value is not None:
                setattr(practice, key, value)
        await db.flush()
        return practice
