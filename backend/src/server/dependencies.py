from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.exceptions import UnauthorizedException, ForbiddenException
from src.services.clerk.clerk_service import ClerkService
from src.services.practice.practice_services import PracticeService
from src.services.practice.plan_capabilities import allows_category, allows_agent
from src.models.user import User
from src.models.practice import Practice
from src.models.subscription import SubscriptionTier


async def get_current_user(
    authorization: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "")
    clerk = ClerkService()
    user = await clerk.verify_token(token)

    if not user:
        raise UnauthorizedException("Invalid or expired token")

    return user


async def get_optional_user(
    authorization: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")
    clerk = ClerkService()
    user = await clerk.verify_token(token)
    return user


async def get_current_practice_user(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    # `get_current_user` only proves the request carries a *valid Clerk
    # session* — it says nothing about which practice that person belongs to,
    # since Clerk's JWT doesn't carry our `practice_id`. Any endpoint that
    # scopes data by practice (conversations, patients, appointments, ...)
    # needs to resolve Clerk's `sub` to a local `User` row for that instead of
    # trusting a client-supplied practice_id.
    result = await db.execute(select(User).where(User.clerk_id == user.get("sub")))
    local_user = result.scalar_one_or_none()
    if local_user is None:
        raise UnauthorizedException("No practice account found for this Clerk user")
    if not local_user.is_active:
        raise UnauthorizedException("This account has been deactivated")
    return local_user


@dataclass
class PracticeContext:
    user: User
    practice: Practice
    tier: SubscriptionTier


async def get_current_practice_context(
    local_user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
) -> PracticeContext:
    # get_current_practice_user only resolves Clerk -> local User — nothing
    # attaches the practice's plan tier. Real enforcement (require_plan_feature
    # below) needs this, not just the frontend's presentation-only gating in
    # app/dashboard/plan/.
    practice_service = PracticeService()
    practice = await practice_service.get_practice(db, local_user.practice_id)
    if practice is None:
        raise UnauthorizedException("Practice not found for this account")
    tier = await practice_service.tier_for(db, practice.id)
    return PracticeContext(user=local_user, practice=practice, tier=tier)


def require_plan_feature(feature: str):
    """Dependency factory — currently only 'analytics' is a plain feature
    flag (mirrors dashboard/plan/planCapabilities.ts's FeatureKey). Agent
    access is gated separately via require_agent_category/require_agent."""

    async def _check(ctx: PracticeContext = Depends(get_current_practice_context)) -> PracticeContext:
        if feature == "analytics" and ctx.tier == SubscriptionTier.SOLO:
            raise ForbiddenException(f"Analytics requires the Practice plan or higher — you're on {ctx.tier.value}.")
        return ctx

    return _check


def require_agent_category(category_id: str):
    async def _check(ctx: PracticeContext = Depends(get_current_practice_context)) -> PracticeContext:
        if not allows_category(ctx.tier, category_id):
            raise ForbiddenException(f"This agent category isn't included in your {ctx.tier.value} plan.")
        return ctx

    return _check


def require_agent(agent_slug: str):
    async def _check(ctx: PracticeContext = Depends(get_current_practice_context)) -> PracticeContext:
        if not allows_agent(ctx.tier, agent_slug):
            raise ForbiddenException(f"This agent isn't included in your {ctx.tier.value} plan.")
        return ctx

    return _check
