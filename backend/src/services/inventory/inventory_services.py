from __future__ import annotations
from datetime import date
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.inventory_item import InventoryItem
from src.models.inventory_batch import InventoryBatch
from src.schemas.inventory import CreateInventoryItemRequest, UpdateInventoryItemRequest, ReceiveBatchRequest
from src.server.exceptions import NotFoundException, AppException


class InventoryService:
    """SKU catalog (InventoryItem) + received lots (InventoryBatch) — an
    item's on-hand quantity is always the live sum of its batches, never a
    stored counter, so it can't drift out of sync. Every method is
    practice-scoped."""

    async def create_item(self, db: AsyncSession, practice_id: UUID, data: CreateInventoryItemRequest) -> InventoryItem:
        item = InventoryItem(
            practice_id=practice_id,
            name=data.name,
            sku=data.sku,
            category=data.category,
            unit=data.unit,
            reorder_threshold=data.reorder_threshold,
        )
        db.add(item)
        await db.flush()
        await db.refresh(item)
        await self._attach_on_hand(db, [item])
        return item

    async def list_items(self, db: AsyncSession, practice_id: UUID) -> list[InventoryItem]:
        query = select(InventoryItem).where(InventoryItem.practice_id == practice_id).order_by(InventoryItem.name)
        result = await db.execute(query)
        items = list(result.scalars().all())
        await self._attach_on_hand(db, items)
        return items

    async def get_item(self, db: AsyncSession, practice_id: UUID, item_id: UUID) -> InventoryItem:
        query = select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.practice_id == practice_id)
        result = await db.execute(query)
        item = result.scalar_one_or_none()
        if item is None:
            raise NotFoundException("Inventory item not found")
        await self._attach_on_hand(db, [item])
        return item

    async def update_item(
        self, db: AsyncSession, practice_id: UUID, item_id: UUID, data: UpdateInventoryItemRequest
    ) -> InventoryItem:
        item = await self.get_item(db, practice_id, item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await db.flush()
        await db.refresh(item)
        await self._attach_on_hand(db, [item])
        return item

    async def receive_batch(
        self, db: AsyncSession, practice_id: UUID, item_id: UUID, data: ReceiveBatchRequest
    ) -> InventoryBatch:
        await self.get_item(db, practice_id, item_id)
        if data.quantity <= 0:
            raise AppException("Quantity received must be greater than zero")
        batch = InventoryBatch(
            inventory_item_id=item_id,
            lot_number=data.lot_number,
            quantity=data.quantity,
            expiry_date=data.expiry_date,
            received_at=data.received_at or date.today(),
        )
        db.add(batch)
        await db.flush()
        await db.refresh(batch)
        return batch

    async def list_batches(self, db: AsyncSession, practice_id: UUID, item_id: UUID) -> list[InventoryBatch]:
        await self.get_item(db, practice_id, item_id)
        query = (
            select(InventoryBatch)
            .where(InventoryBatch.inventory_item_id == item_id)
            .order_by(InventoryBatch.expiry_date.asc().nulls_last(), InventoryBatch.received_at.asc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def consume(self, db: AsyncSession, practice_id: UUID, item_id: UUID, quantity: int) -> InventoryItem:
        """Decrements on-hand stock, oldest-expiry-first (FEFO), across
        however many batches it takes to cover the requested quantity."""
        if quantity <= 0:
            raise AppException("Quantity to consume must be greater than zero")
        await self.get_item(db, practice_id, item_id)
        batches = await self.list_batches(db, practice_id, item_id)

        # Check availability across ALL batches before mutating any of
        # them — mutating as we go and raising partway through would leave
        # some batches decremented in memory, which a later query in this
        # same session (autoflush) could flush to the DB despite the
        # overall request having failed.
        if sum(b.quantity for b in batches) < quantity:
            raise AppException(f"Not enough stock on hand — short by {quantity - sum(b.quantity for b in batches)}")

        remaining = quantity
        for batch in batches:
            if remaining <= 0:
                break
            if batch.quantity <= 0:
                continue
            take = min(batch.quantity, remaining)
            batch.quantity -= take
            remaining -= take

        await db.flush()
        return await self.get_item(db, practice_id, item_id)

    async def _attach_on_hand(self, db: AsyncSession, items: list[InventoryItem]) -> None:
        if not items:
            return
        item_ids = [i.id for i in items]
        result = await db.execute(
            select(InventoryBatch.inventory_item_id, func.coalesce(func.sum(InventoryBatch.quantity), 0))
            .where(InventoryBatch.inventory_item_id.in_(item_ids))
            .group_by(InventoryBatch.inventory_item_id)
        )
        totals = {row[0]: int(row[1]) for row in result.all()}
        for item in items:
            on_hand = totals.get(item.id, 0)
            item.on_hand_quantity = on_hand
            item.is_low_stock = item.reorder_threshold is not None and on_hand <= item.reorder_threshold
