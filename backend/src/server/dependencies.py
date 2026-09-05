from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.database import get_db
from src.server.exceptions import UnauthorizedException, ForbiddenException
from src.services.clerk.clerk_service import ClerkService
from src.services.practice.practice_services import PracticeService
from src.services.admin.plan_services import PlanService
from src.services.admin.admin_auth_service import verify_admin_token
from src.services.patient_portal.patient_portal_auth_service import PatientPortalAuthService
from src.models.user import User, UserRole
from src.models.practice import Practice
from src.models.patient import Patient
from src.models.subscription import SubscriptionTier

plan_service = PlanService()


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

    # Self-heal a reissued Clerk `sub` (a dev-instance reset / reinstall gives
    # every account a NEW id while emails stay stable). When no row matches
    # the sub, re-link by email so the existing practice account keeps working
    # instead of 401-ing until manually re-provisioned.
    if local_user is None:
        # Clerk's default session JWT often omits `email` (only sub/sid are
        # guaranteed) — fall back to the Backend API when the claim is
        # missing, same pattern as PracticeController.claim does for checkout.
        email = (user.get("email") or "").strip().lower()
        if not email:
            full_user = await ClerkService().get_user(user.get("sub"))
            if full_user:
                addrs = full_user.get("email_addresses") or []
                email = addrs[0]["email_address"].strip().lower() if addrs else ""
        if email:
            result = await db.execute(select(User).where(func.lower(User.email) == email))
            local_user = result.scalar_one_or_none()
            if local_user is not None:
                local_user.clerk_id = user.get("sub")
                await db.flush()

    if local_user is None:
        raise UnauthorizedException("No practice account found for this Clerk user")
    if not local_user.is_active:
        raise UnauthorizedException("This account has been deactivated")

    # Self-heal platform-admin status from the bootstrap allowlist — mirrors
    # AgentCostingService's "self-seeding on first read" pattern. Only ever
    # promotes (never demotes here); once at least one admin exists, further
    # promotions happen from the admin panel itself, not this list.
    settings = get_settings()
    admin_emails = {e.strip().lower() for e in settings.platform_admin_emails.split(",") if e.strip()}
    if local_user.email.lower() in admin_emails and not local_user.is_platform_admin:
        local_user.is_platform_admin = True
        await db.flush()

    return local_user


async def get_current_user_record(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Like get_current_practice_user, but deliberately skips the is_active
    # check — used only by the doctor self-application endpoints, where the
    # applicant's User row is intentionally created inactive (see the
    # user.created webhook's doctor_self_apply branch) until an Owner
    # approves them. Every other practice-scoped endpoint should keep using
    # get_current_practice_user instead.
    result = await db.execute(select(User).where(User.clerk_id == user.get("sub")))
    local_user = result.scalar_one_or_none()
    if local_user is None:
        raise UnauthorizedException("No account found for this Clerk user")
    return local_user


async def require_platform_admin(local_user: User = Depends(get_current_practice_user)) -> User:
    if not local_user.is_platform_admin:
        raise ForbiddenException("Platform admin access required.")
    return local_user


def require_role(*roles: UserRole):
    """Dependency factory gating an endpoint to specific practice roles —
    e.g. Depends(require_role(UserRole.OWNER)) for owner-only actions."""

    async def _check(local_user: User = Depends(get_current_practice_user)) -> User:
        if local_user.role not in roles:
            raise ForbiddenException("You don't have permission to perform this action.")
        return local_user

    return _check


portal_auth_service = PatientPortalAuthService()


async def get_current_portal_patient(
    authorization: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    # The Patient Portal's own auth surface — a self-issued JWT from a
    # portal_id+PIN login (see patient_portal_auth_service.py), completely
    # separate from Clerk. Every /patient-portal/me* endpoint depends on
    # this instead of get_current_practice_user.
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid authorization header")
    token = authorization.replace("Bearer ", "")
    patient_id = portal_auth_service.verify_token(token)

    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if patient is None or not patient.portal_enabled:
        raise UnauthorizedException("Invalid or expired session — please log in again")
    return patient


@dataclass
class AdminPrincipal:
    username: str


async def require_admin_token(authorization: str = Header(default="")) -> AdminPrincipal:
    # The platform admin panel's real gate — a standalone username/password +
    # JWT login (POST /api/v1/admin/auth/login, admin_auth_service.py),
    # deliberately independent of Clerk (require_platform_admin above is the
    # earlier Clerk-based mechanism; kept for reference/future multi-admin
    # use, but every /admin/* route now depends on THIS instead).
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid authorization header")
    token = authorization.replace("Bearer ", "")
    payload = verify_admin_token(token)
    if payload is None:
        raise UnauthorizedException("Invalid or expired admin token")
    return AdminPrincipal(username=payload["sub"])


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

    async def _check(
        ctx: PracticeContext = Depends(get_current_practice_context),
        db: AsyncSession = Depends(get_db),
    ) -> PracticeContext:
        if feature == "analytics" and not await plan_service.has_analytics(db, ctx.tier):
            raise ForbiddenException(f"Analytics requires the Practice plan or higher — you're on {ctx.tier.value}.")
        return ctx

    return _check


def require_agent_category(category_id: str):
    async def _check(
        ctx: PracticeContext = Depends(get_current_practice_context),
        db: AsyncSession = Depends(get_db),
    ) -> PracticeContext:
        if not await plan_service.allows_category(db, ctx.tier, category_id):
            raise ForbiddenException(f"This agent category isn't included in your {ctx.tier.value} plan.")
        return ctx

    return _check


def require_agent(agent_slug: str):
    async def _check(
        ctx: PracticeContext = Depends(get_current_practice_context),
        db: AsyncSession = Depends(get_db),
    ) -> PracticeContext:
        if not await plan_service.allows_agent(db, ctx.tier, agent_slug):
            raise ForbiddenException(f"This agent isn't included in your {ctx.tier.value} plan.")
        return ctx

    return _check
