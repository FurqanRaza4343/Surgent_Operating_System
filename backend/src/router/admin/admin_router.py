from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.admin import (
    AdminSummaryResponse,
    AdminPracticeListItem,
    AdminPracticeDetailResponse,
    UpdateSubscriptionRequest,
    AdminUserResponse,
    UpdateAdminUserRequest,
    AdminMeResponse,
    AdminLoginRequest,
    AdminLoginResponse,
)
from src.schemas.plan import PlanResponse, PlanCreateRequest, PlanUpdateRequest
from src.controller.admin.admin_controllers import AdminController
from src.server.dependencies import require_admin_token, AdminPrincipal

# Every route here (except /auth/login) is platform-owner-only (Aiaceone
# team), never clinic-facing — enforced by require_admin_token (a standalone
# username/password + JWT login, see services/admin/admin_auth_service.py),
# not just hidden by frontend routing.
router = APIRouter(prefix="/admin", tags=["Platform Admin"])
controller = AdminController()


@router.post("/auth/login", response_model=AdminLoginResponse)
async def login(body: AdminLoginRequest):
    return await controller.login(body)


@router.get("/me", response_model=AdminMeResponse)
async def get_me(admin: AdminPrincipal = Depends(require_admin_token)):
    return await controller.me(admin)


@router.get("/summary", response_model=AdminSummaryResponse)
async def get_summary(
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.summary(db)


@router.get("/practices", response_model=list[AdminPracticeListItem])
async def list_practices(
    q: Optional[str] = None,
    plan_tier: Optional[str] = None,
    sort: str = "-joined_at",
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_practices(db, q=q, plan_tier=plan_tier, sort=sort)


@router.get("/practices/{practice_id}", response_model=AdminPracticeDetailResponse)
async def get_practice_detail(
    practice_id: UUID,
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.practice_detail(db, practice_id)


@router.patch("/practices/{practice_id}/subscription", response_model=AdminPracticeDetailResponse)
async def update_practice_subscription(
    practice_id: UUID,
    body: UpdateSubscriptionRequest,
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_subscription(db, practice_id, body)


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_plans(db)


@router.post("/plans", response_model=PlanResponse)
async def create_plan(
    body: PlanCreateRequest,
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_plan(db, body)


@router.patch("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: UUID,
    body: PlanUpdateRequest,
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_plan(db, plan_id, body)


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    q: Optional[str] = None,
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_users(db, q=q)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: UUID,
    body: UpdateAdminUserRequest,
    admin: AdminPrincipal = Depends(require_admin_token),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_user(db, user_id, body)
