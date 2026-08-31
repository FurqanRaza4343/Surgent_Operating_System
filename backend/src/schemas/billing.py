from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class CreateInvoiceLineItemRequest(BaseModel):
    treatment_plan_item_id: UUID | None = None
    description: str
    quantity: int = 1
    unit_price: float


class CreateInvoiceRequest(BaseModel):
    patient_id: UUID
    appointment_id: UUID | None = None
    # When set and no explicit `line_items` are given, the invoice's lines
    # are auto-built from this plan's items (using each item's actual price
    # if it's been performed, else its estimated price, else the procedure's
    # catalog price). Passing `line_items` always overrides this — that's
    # the "ad-hoc" path.
    treatment_plan_id: UUID | None = None
    line_items: list[CreateInvoiceLineItemRequest] = []
    tax_amount: float = 0
    discount_amount: float = 0
    due_date: date | None = None


class UpdateInvoiceRequest(BaseModel):
    status: str | None = None
    due_date: date | None = None
    tax_amount: float | None = None
    discount_amount: float | None = None


class InvoiceLineItemResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    treatment_plan_item_id: UUID | None
    description: str
    quantity: int
    unit_price: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    appointment_id: UUID | None
    treatment_plan_id: UUID | None
    subtotal_amount: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    status: str
    due_date: date | None
    paid_at: datetime | None
    line_items: list[InvoiceLineItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
