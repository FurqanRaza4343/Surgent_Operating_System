from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime


class CreatePurchaseOrderItemLine(BaseModel):
    inventory_item_id: UUID
    quantity_ordered: int
    unit_cost: float | None = None


class CreatePurchaseOrderRequest(BaseModel):
    supplier_id: UUID
    notes: str | None = None
    items: list[CreatePurchaseOrderItemLine]


class ReceivePurchaseOrderLine(BaseModel):
    purchase_order_item_id: UUID
    quantity: int
    lot_number: str | None = None
    expiry_date: date | None = None


class ReceivePurchaseOrderRequest(BaseModel):
    items: list[ReceivePurchaseOrderLine]


class PurchaseOrderItemResponse(BaseModel):
    id: UUID
    inventory_item_id: UUID
    quantity_ordered: int
    quantity_received: int
    unit_cost: float | None

    model_config = {"from_attributes": True}


class PurchaseOrderResponse(BaseModel):
    id: UUID
    practice_id: UUID
    supplier_id: UUID
    status: str
    ordered_at: date | None
    received_at: date | None
    notes: str | None
    items: list[PurchaseOrderItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
