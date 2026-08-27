from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.practice import PracticeMeResponse, UpdatePracticeRequest, ClaimPlanRequest, ClaimPlanResponse
from src.controller.practice.practice_controllers import PracticeController
from src.server.dependencies import get_current_practice_context, get_current_user, PracticeContext

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


@router.post("/claim", response_model=ClaimPlanResponse)
async def claim_plan(
    body: ClaimPlanRequest,
    # Deliberately get_current_user, not get_current_practice_context — at
    # claim time no local User row exists yet (that's what this endpoint creates).
    clerk_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.claim(db, clerk_user, body.session_id)
