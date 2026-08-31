from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class CreateInventoryItemRequest(BaseModel):
    name: str
    sku: str | None = None
    category: str | None = None
    unit: str | None = None
    reorder_threshold: int | None = None


class UpdateInventoryItemRequest(BaseModel):
    name: str | None = None
    sku: str | None = None
    category: str | None = None
    unit: str | None = None
    reorder_threshold: int | None = None
    is_active: bool | None = None


class InventoryItemResponse(BaseModel):
    id: UUID
    practice_id: UUID
    name: str
    sku: str | None
    category: str | None
    unit: str | None
    reorder_threshold: int | None
    is_active: bool
    # Computed from the item's batches (see InventoryService), not a stored
    # column — always the current real sum, never stale.
    on_hand_quantity: int = 0
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReceiveBatchRequest(BaseModel):
    lot_number: str | None = None
    quantity: int
    expiry_date: date | None = None
    received_at: date | None = None


class ConsumeStockRequest(BaseModel):
    quantity: int


class InventoryBatchResponse(BaseModel):
    id: UUID
    inventory_item_id: UUID
    lot_number: str | None
    quantity: int
    expiry_date: date | None
    received_at: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
