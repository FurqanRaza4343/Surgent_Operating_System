from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import require_role
from src.models.user import User, UserRole
from src.schemas.supplier import CreateSupplierRequest, UpdateSupplierRequest, SupplierResponse
from src.controller.inventory.supplier_controllers import SupplierController

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])
controller = SupplierController()
_ROLES = (UserRole.OWNER, UserRole.RECEPTIONIST)


@router.post("", response_model=SupplierResponse)
async def create_supplier(
    data: CreateSupplierRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_supplier(db, user, data)


@router.get("", response_model=list[SupplierResponse])
async def list_suppliers(
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_suppliers(db, user)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_supplier(db, user, supplier_id)


@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    data: UpdateSupplierRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_supplier(db, user, supplier_id, data)
