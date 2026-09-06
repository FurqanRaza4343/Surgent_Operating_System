from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import require_role
from src.models.user import User, UserRole
from src.schemas.purchase_order import CreatePurchaseOrderRequest, ReceivePurchaseOrderRequest, PurchaseOrderResponse
from src.controller.inventory.purchase_order_controllers import PurchaseOrderController

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])
controller = PurchaseOrderController()
_ROLES = (UserRole.OWNER, UserRole.RECEPTIONIST)


@router.post("", response_model=PurchaseOrderResponse)
async def create_order(
    data: CreatePurchaseOrderRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_order(db, user, data)


@router.get("", response_model=list[PurchaseOrderResponse])
async def list_orders(
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_orders(db, user)


@router.get("/{order_id}", response_model=PurchaseOrderResponse)
async def get_order(
    order_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_order(db, user, order_id)


@router.patch("/{order_id}/mark-ordered", response_model=PurchaseOrderResponse)
async def mark_ordered(
    order_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.mark_ordered(db, user, order_id)


@router.patch("/{order_id}/cancel", response_model=PurchaseOrderResponse)
async def cancel_order(
    order_id: UUID,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.cancel_order(db, user, order_id)


@router.post("/{order_id}/receive", response_model=PurchaseOrderResponse)
async def receive_order(
    order_id: UUID,
    data: ReceivePurchaseOrderRequest,
    user: User = Depends(require_role(*_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.receive_order(db, user, order_id, data)
