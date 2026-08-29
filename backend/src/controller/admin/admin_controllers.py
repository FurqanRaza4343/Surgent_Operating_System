from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from src.schemas.admin import (
    AdminSummaryResponse,
    AdminPracticeListItem,
    AdminPracticeDetailResponse,
    AgentCostBreakdownItem,
    UpdateSubscriptionRequest,
    AdminUserResponse,
    UpdateAdminUserRequest,
    AdminMeResponse,
    AdminLoginRequest,
    AdminLoginResponse,
)
from src.schemas.plan import PlanResponse, PlanCreateRequest, PlanUpdateRequest
from src.services.admin.admin_services import AdminService
from src.services.admin.plan_services import PlanService
from src.services.admin import admin_auth_service
from src.server.dependencies import AdminPrincipal
from src.server.exceptions import NotFoundException, UnauthorizedException


class AdminController:
    def __init__(self):
        self.service = AdminService()
        self.plans = PlanService()

    async def login(self, body: AdminLoginRequest) -> AdminLoginResponse:
        if not admin_auth_service.authenticate(body.username, body.password):
            raise UnauthorizedException("Invalid username or password.")
        return AdminLoginResponse(access_token=admin_auth_service.create_admin_token())

    async def me(self, admin: AdminPrincipal) -> AdminMeResponse:
        return AdminMeResponse(username=admin.username)

    async def summary(self, db: AsyncSession) -> AdminSummaryResponse:
        data = await self.service.platform_summary(db)
        return AdminSummaryResponse(
            total_clinics=data["total_clinics"],
            plan_distribution=data["plan_distribution"],
            total_estimated_mrr=float(data["total_estimated_mrr"]),
            total_estimated_cost=float(data["total_estimated_cost"]),
            total_estimated_margin=float(data["total_estimated_margin"]),
            margin_percent=data["margin_percent"],
        )

    async def list_practices(self, db: AsyncSession, q: str | None, plan_tier: str | None, sort: str) -> list[AdminPracticeListItem]:
        rows = await self.service.list_practices(db, q=q, plan_tier=plan_tier, sort=sort)
        return [
            AdminPracticeListItem(
                id=row["id"],
                name=row["name"],
                email=row["email"],
                plan_tier=row["plan_tier"],
                subscription_status=row["subscription_status"],
                agents_enabled_count=row["agents_enabled_count"],
                estimated_monthly_cost=float(row["estimated_monthly_cost"]),
                estimated_monthly_revenue=float(row["estimated_monthly_revenue"]),
                joined_at=row["joined_at"],
            )
            for row in rows
        ]

    async def practice_detail(self, db: AsyncSession, practice_id) -> AdminPracticeDetailResponse:
        data = await self.service.practice_detail(db, practice_id)
        if data is None:
            raise NotFoundException("Practice not found.")
        return AdminPracticeDetailResponse(
            id=data["id"],
            name=data["name"],
            email=data["email"],
            phone=data["phone"],
            address=data["address"],
            plan_tier=data["plan_tier"],
            subscription_status=data["subscription_status"],
            estimated_monthly_revenue=float(data["estimated_monthly_revenue"]),
            estimated_monthly_cost=float(data["estimated_monthly_cost"]),
            agent_breakdown=[
                AgentCostBreakdownItem(
                    agent_slug=b["agent_slug"],
                    enabled=b["enabled"],
                    cost_per_session=float(b["cost_per_session"]),
                    estimated_monthly_cost=float(b["estimated_monthly_cost"]),
                )
                for b in data["agent_breakdown"]
            ],
            joined_at=data["joined_at"],
        )

    async def update_subscription(self, db: AsyncSession, practice_id, body: UpdateSubscriptionRequest) -> AdminPracticeDetailResponse:
        try:
            new_tier = SubscriptionTier(body.tier)
        except ValueError:
            raise NotFoundException(f"Unknown plan tier: {body.tier}")

        plan = await self.plans.get_plan_by_tier(db, new_tier)

        result = await db.execute(
            select(Subscription)
            .where(Subscription.practice_id == practice_id)
            .where(Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]))
            .order_by(Subscription.created_at.desc())
        )
        sub = result.scalars().first()

        if sub is None:
            sub = Subscription(
                practice_id=practice_id,
                tier=new_tier,
                status=SubscriptionStatus.ACTIVE,
                price=plan.price if plan else None,
                start_date=date.today(),
            )
            db.add(sub)
        else:
            sub.tier = new_tier
            # Moving a clinic to a new tier updates what they're charged
            # going forward — this is an explicit admin action, not the
            # "never rewrite retroactively" concern Plan.price's docstring
            # warns about (that's about Plan edits silently drifting every
            # subscriber; this is a deliberate one-off per-practice change).
            if plan is not None and plan.price is not None:
                sub.price = plan.price

        await db.flush()
        return await self.practice_detail(db, practice_id)

    async def list_plans(self, db: AsyncSession) -> list[PlanResponse]:
        plans = await self.plans.list_plans(db)
        return [PlanResponse.from_model(p) for p in plans]

    async def create_plan(self, db: AsyncSession, body: PlanCreateRequest) -> PlanResponse:
        plan = await self.plans.create_plan(db, tier=SubscriptionTier(body.tier), **body.model_dump(exclude={"tier"}))
        return PlanResponse.from_model(plan)

    async def update_plan(self, db: AsyncSession, plan_id, body: PlanUpdateRequest) -> PlanResponse:
        plan = await self.plans.get_plan(db, plan_id)
        if plan is None:
            raise NotFoundException("Plan not found.")
        plan = await self.plans.update_plan(db, plan, **body.model_dump(exclude_unset=True, exclude_none=True))
        return PlanResponse.from_model(plan)

    async def list_users(self, db: AsyncSession, q: str | None) -> list[AdminUserResponse]:
        users = await self.service.list_users(db, q=q)
        return [AdminUserResponse.model_validate(u) for u in users]

    async def update_user(self, db: AsyncSession, user_id, body: UpdateAdminUserRequest) -> AdminUserResponse:
        user = await self.service.get_user(db, user_id)
        if user is None:
            raise NotFoundException("User not found.")
        user.is_platform_admin = body.is_platform_admin
        await db.flush()
        return AdminUserResponse.model_validate(user)
