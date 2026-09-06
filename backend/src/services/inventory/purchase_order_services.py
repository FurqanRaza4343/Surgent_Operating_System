from __future__ import annotations
from datetime import date, timezone, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.purchase_order import PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus
from src.models.supplier import Supplier
from src.schemas.purchase_order import CreatePurchaseOrderRequest, ReceivePurchaseOrderRequest
from src.schemas.inventory import ReceiveBatchRequest
from src.server.exceptions import NotFoundException, AppException
from src.services.inventory.inventory_services import InventoryService


class PurchaseOrderService:
    """Real ordering path: draft a PO with line items against a Supplier,
    mark it ordered, then receive it — receiving creates real
    InventoryBatch rows (via InventoryService.receive_batch, so every
    receipt gets the same InventoryAdjustment("received") trail a
    directly-added batch does) and stamps quantity_received per line."""

    def __init__(self):
        self.inventory = InventoryService()

    async def _get_supplier(self, db: AsyncSession, practice_id: UUID, supplier_id: UUID) -> Supplier:
        result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, Supplier.practice_id == practice_id))
        supplier = result.scalar_one_or_none()
        if supplier is None:
            raise NotFoundException("Supplier not found")
        return supplier

    async def create_order(self, db: AsyncSession, practice_id: UUID, data: CreatePurchaseOrderRequest) -> PurchaseOrder:
        await self._get_supplier(db, practice_id, data.supplier_id)
        if not data.items:
            raise AppException("A purchase order needs at least one line item")

        order = PurchaseOrder(practice_id=practice_id, supplier_id=data.supplier_id, notes=data.notes)
        db.add(order)
        await db.flush()

        for line in data.items:
            await self.inventory.get_item(db, practice_id, line.inventory_item_id)  # validates it belongs to this practice
            db.add(PurchaseOrderItem(
                purchase_order_id=order.id, inventory_item_id=line.inventory_item_id,
                quantity_ordered=line.quantity_ordered, unit_cost=line.unit_cost,
            ))
        await db.flush()
        return await self.get_order(db, practice_id, order.id)

    async def get_order(self, db: AsyncSession, practice_id: UUID, order_id: UUID) -> PurchaseOrder:
        result = await db.execute(
            select(PurchaseOrder)
            .where(PurchaseOrder.id == order_id, PurchaseOrder.practice_id == practice_id)
            .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.supplier))
        )
        order = result.scalar_one_or_none()
        if order is None:
            raise NotFoundException("Purchase order not found")
        return order

    async def list_orders(self, db: AsyncSession, practice_id: UUID) -> list[PurchaseOrder]:
        result = await db.execute(
            select(PurchaseOrder)
            .where(PurchaseOrder.practice_id == practice_id)
            .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.supplier))
            .order_by(PurchaseOrder.created_at.desc())
        )
        return list(result.scalars().all())

    async def mark_ordered(self, db: AsyncSession, practice_id: UUID, order_id: UUID) -> PurchaseOrder:
        order = await self.get_order(db, practice_id, order_id)
        if order.status != PurchaseOrderStatus.DRAFT:
            raise AppException(f"Cannot mark a {order.status.value} order as ordered")
        order.status = PurchaseOrderStatus.ORDERED
        order.ordered_at = date.today()
        await db.flush()
        return await self.get_order(db, practice_id, order.id)

    async def cancel_order(self, db: AsyncSession, practice_id: UUID, order_id: UUID) -> PurchaseOrder:
        order = await self.get_order(db, practice_id, order_id)
        if order.status == PurchaseOrderStatus.RECEIVED:
            raise AppException("Cannot cancel an already-received order")
        order.status = PurchaseOrderStatus.CANCELLED
        await db.flush()
        return await self.get_order(db, practice_id, order.id)

    async def receive_order(
        self, db: AsyncSession, practice_id: UUID, order_id: UUID, data: ReceivePurchaseOrderRequest, performed_by: str | None = None,
    ) -> PurchaseOrder:
        """Receives some or all line items — a real batch is created (with
        lot/expiry if given) for each line named in `data.items`, and that
        line's quantity_received is bumped. The order moves to RECEIVED
        only once every line is fully received; a partial receipt (a real,
        common case — suppliers backorder) leaves it ORDERED so it stays
        visible as still-open."""
        order = await self.get_order(db, practice_id, order_id)
        if order.status not in (PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.DRAFT):
            raise AppException(f"Cannot receive a {order.status.value} order")

        items_by_id = {item.id: item for item in order.items}
        for line in data.items:
            po_item = items_by_id.get(line.purchase_order_item_id)
            if po_item is None:
                raise NotFoundException(f"Line item {line.purchase_order_item_id} not on this order")
            remaining = po_item.quantity_ordered - po_item.quantity_received
            if line.quantity > remaining:
                raise AppException(
                    f"Cannot receive {line.quantity} — only {remaining} still outstanding on this line"
                )
            await self.inventory.receive_batch(
                db, practice_id, po_item.inventory_item_id,
                ReceiveBatchRequest(quantity=line.quantity, lot_number=line.lot_number, expiry_date=line.expiry_date),
                resource_type="purchase_order", resource_id=order.id, performed_by=performed_by,
            )
            po_item.quantity_received += line.quantity

        await db.flush()
        order = await self.get_order(db, practice_id, order.id)
        if all(item.quantity_received >= item.quantity_ordered for item in order.items):
            order.status = PurchaseOrderStatus.RECEIVED
            order.received_at = date.today()
            await db.flush()
        return await self.get_order(db, practice_id, order.id)
