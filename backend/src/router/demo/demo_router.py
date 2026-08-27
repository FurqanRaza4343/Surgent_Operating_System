from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.demo_request import DemoRequestCreate, DemoRequestResponse
from src.controller.demo.demo_controllers import DemoController

# No auth — a demo-request submitter has no Clerk session, same reasoning as
# checkout_router.py.
router = APIRouter(prefix="/demo-requests", tags=["Demo Requests"])
controller = DemoController()


@router.post("", response_model=DemoRequestResponse)
async def create_demo_request(
    body: DemoRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_demo_request(
        db, body.name, body.email, body.phone, body.practice_name, body.message
    )
