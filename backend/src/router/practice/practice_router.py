from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.practice import (
    PracticeMeResponse,
    UpdatePracticeRequest,
    ClaimPlanRequest,
    ClaimPlanResponse,
    DoctorSignupCodeResponse,
    ValidateDoctorCodeResponse,
)
from src.controller.practice.practice_controllers import PracticeController
from src.server.dependencies import get_current_practice_context, get_current_user, PracticeContext
from src.server.exceptions import ForbiddenException
from src.models.user import UserRole

router = APIRouter(prefix="/practice", tags=["Practice"])
controller = PracticeController()


@router.get("/me", response_model=PracticeMeResponse)
async def get_me(
    ctx: PracticeContext = Depends(get_current_practice_context),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_me(db, ctx)


@router.patch("/me", response_model=PracticeMeResponse)
async def update_me(
    body: UpdatePracticeRequest,
    ctx: PracticeContext = Depends(get_current_practice_context),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_me(db, ctx, body)


@router.get("/doctor-signup-code", response_model=DoctorSignupCodeResponse)
async def get_doctor_signup_code(
    ctx: PracticeContext = Depends(get_current_practice_context),
    db: AsyncSession = Depends(get_db),
):
    if ctx.user.role != UserRole.OWNER:
        raise ForbiddenException("Only the practice owner can view the doctor signup link.")
    return await controller.get_doctor_signup_code(db, ctx)


@router.post("/doctor-signup-code/regenerate", response_model=DoctorSignupCodeResponse)
async def regenerate_doctor_signup_code(
    ctx: PracticeContext = Depends(get_current_practice_context),
    db: AsyncSession = Depends(get_db),
):
    if ctx.user.role != UserRole.OWNER:
        raise ForbiddenException("Only the practice owner can regenerate the doctor signup link.")
    return await controller.regenerate_doctor_signup_code(db, ctx)


@router.get("/validate-doctor-code", response_model=ValidateDoctorCodeResponse)
async def validate_doctor_code(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Deliberately public/unauthenticated — a prospective doctor needs to
    # confirm the link is valid (and see which practice it's for) before
    # they've created any account at all.
    return await controller.validate_doctor_code(db, code)


@router.post("/claim", response_model=ClaimPlanResponse)
async def claim_plan(
    body: ClaimPlanRequest,
    # Deliberately get_current_user, not get_current_practice_context — at
    # claim time no local User row exists yet (that's what this endpoint creates).
    clerk_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.claim(db, clerk_user, body.session_id)
