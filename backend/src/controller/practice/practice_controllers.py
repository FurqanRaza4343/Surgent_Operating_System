from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.pending_signup import PendingSignup
from src.schemas.practice import PracticeMeResponse, UpdatePracticeRequest, ClaimPlanResponse
from src.services.practice.practice_services import PracticeService
from src.services.checkout.provisioning_service import ProvisioningService
from src.services.clerk.clerk_service import ClerkService
from src.server.dependencies import PracticeContext
from src.server.exceptions import NotFoundException, ForbiddenException


class PracticeController:
    def __init__(self):
        self.service = PracticeService()
        self.provisioning = ProvisioningService()

    async def get_me(self, db: AsyncSession, ctx: PracticeContext) -> PracticeMeResponse:
        sub = await self.service.active_subscription_for(db, ctx.practice.id)
        return PracticeMeResponse(
            id=ctx.practice.id,
            name=ctx.practice.name,
            email=ctx.practice.email,
            phone=ctx.practice.phone,
            address=ctx.practice.address,
            timezone=ctx.practice.timezone,
            plan_tier=ctx.tier.value,
            subscription_status=sub.status.value if sub else "trial",
        )

    async def update_me(self, db: AsyncSession, ctx: PracticeContext, body: UpdatePracticeRequest) -> PracticeMeResponse:
        await self.service.update_practice(
            db, ctx.practice, name=body.name, phone=body.phone, address=body.address, timezone=body.timezone
        )
        return await self.get_me(db, ctx)

    async def claim(self, db: AsyncSession, clerk_user: dict, session_id: str) -> ClaimPlanResponse:
        result = await db.execute(select(PendingSignup).where(PendingSignup.stripe_session_id == session_id))
        pending = result.scalar_one_or_none()
        if pending is None:
            raise NotFoundException("No checkout session found for that id.")

        clerk_id = clerk_user.get("sub")
        clerk_email = clerk_user.get("email")
        clerk_name = clerk_user.get("name")

        # Clerk's default session JWT often omits email unless a custom JWT
        # template adds it — fall back to the Backend API for the real address.
        if not clerk_email:
            clerk = ClerkService()
            full_user = await clerk.get_user(clerk_id)
            if full_user:
                addrs = full_user.get("email_addresses") or []
                clerk_email = addrs[0]["email_address"] if addrs else None

        # v1 claim security: the Clerk account claiming this session must
        # match the email that paid — see app/onboarding/README.md for why
        # this is simpler than a signed single-use token, and its limits.
        if clerk_email and clerk_email.lower() != pending.email.lower():
            raise ForbiddenException("This plan was purchased with a different email address.")

        practice = await self.provisioning.provision_from_pending_signup(db, pending, clerk_id, clerk_email, clerk_name)
        return ClaimPlanResponse(practice_id=practice.id, plan_tier=pending.plan_tier)
