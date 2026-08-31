from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user, require_role
from src.models.user import User, UserRole
from src.schemas.procedure import CreateProcedureRequest, UpdateProcedureRequest, ProcedureResponse
from src.controller.procedures.procedures_controllers import ProceduresController

router = APIRouter(prefix="/procedures", tags=["Procedures"])
controller = ProceduresController()


@router.post("", response_model=ProcedureResponse)
async def create_procedure(
    data: CreateProcedureRequest,
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_procedure(db, user, data)


@router.get("", response_model=list[ProcedureResponse])
async def list_procedures(
    active_only: bool = Query(default=False),
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_procedures(db, user, active_only)


@router.get("/{procedure_id}", response_model=ProcedureResponse)
async def get_procedure(
    procedure_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_procedure(db, user, procedure_id)


@router.patch("/{procedure_id}", response_model=ProcedureResponse)
async def update_procedure(
    procedure_id: UUID,
    data: UpdateProcedureRequest,
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_procedure(db, user, procedure_id, data)
