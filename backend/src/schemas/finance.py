from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class CreateExpenseRequest(BaseModel):
    category: str
    amount: float
    vendor: str | None = None
    expense_date: date
    notes: str | None = None


class UpdateExpenseRequest(BaseModel):
    category: str | None = None
    amount: float | None = None
    vendor: str | None = None
    expense_date: date | None = None
    notes: str | None = None


class ExpenseResponse(BaseModel):
    id: UUID
    practice_id: UUID
    category: str
    amount: float
    vendor: str | None
    expense_date: date
    notes: str | None
    recorded_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinanceOverviewResponse(BaseModel):
    # Real sums, not estimates — $0 with zero counts is a true (not
    # fabricated) value, unlike AnalyticsService.get_overview_summary()'s
    # revenue_estimate, which needs a None/"not enough data" state because
    # it's inferring from possibly-incomplete data. The frontend uses
    # invoice_count/expense_count to decide whether to show an empty state.
    total_revenue: float
    total_expenses: float
    net: float
    invoice_count: int
    expense_count: int
