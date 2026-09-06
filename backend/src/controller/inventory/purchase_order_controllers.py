from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.purchase_order import CreatePurchaseOrderRequest, ReceivePurchaseOrderRequest, PurchaseOrderResponse
from src.services.inventory.purchase_order_services import PurchaseOrderService


class PurchaseOrderController:
    def __init__(self):
        self.service = PurchaseOrderService()

    async def create_order(self, db: AsyncSession, user: User, data: CreatePurchaseOrderRequest) -> PurchaseOrderResponse:
        order = await self.service.create_order(db, user.practice_id, data)
        return PurchaseOrderResponse.model_validate(order)

    async def list_orders(self, db: AsyncSession, user: User) -> list[PurchaseOrderResponse]:
        orders = await self.service.list_orders(db, user.practice_id)
        return [PurchaseOrderResponse.model_validate(o) for o in orders]

    async def get_order(self, db: AsyncSession, user: User, order_id: UUID) -> PurchaseOrderResponse:
        order = await self.service.get_order(db, user.practice_id, order_id)
        return PurchaseOrderResponse.model_validate(order)

    async def mark_ordered(self, db: AsyncSession, user: User, order_id: UUID) -> PurchaseOrderResponse:
        order = await self.service.mark_ordered(db, user.practice_id, order_id)
        return PurchaseOrderResponse.model_validate(order)

    async def cancel_order(self, db: AsyncSession, user: User, order_id: UUID) -> PurchaseOrderResponse:
        order = await self.service.cancel_order(db, user.practice_id, order_id)
        return PurchaseOrderResponse.model_validate(order)

    async def receive_order(self, db: AsyncSession, user: User, order_id: UUID, data: ReceivePurchaseOrderRequest) -> PurchaseOrderResponse:
        order = await self.service.receive_order(db, user.practice_id, order_id, data, performed_by=str(user.id))
        return PurchaseOrderResponse.model_validate(order)
