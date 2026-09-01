from __future__ import annotations
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.expense import Expense
from src.models.invoice import Invoice, InvoiceStatus
from src.schemas.finance import CreateExpenseRequest, UpdateExpenseRequest, FinanceOverviewResponse
from src.server.exceptions import NotFoundException


class FinanceService:
    """Expense tracking + a real revenue-vs-expense overview. Every method
    is practice-scoped. Overview counts revenue as PAID invoices only —
    pending/overdue invoices aren't money in hand yet."""

    async def create_expense(self, db: AsyncSession, practice_id: UUID, user_id: UUID, data: CreateExpenseRequest) -> Expense:
        import datetime as dt
        expense = Expense(
            practice_id=practice_id,
            expense_type=data.expense_type,
            status=data.status,
            category=data.category,
            amount=data.amount,
            vendor=data.vendor,
            payee_name=data.payee_name,
            expense_date=data.expense_date,
            notes=data.notes,
            paid_at=(dt.datetime.now(dt.timezone.utc) if data.status == "paid" else None),
            recorded_by=user_id,
        )
        db.add(expense)
        await db.flush()
        await db.refresh(expense)
        return expense

    async def list_expenses(self, db: AsyncSession, practice_id: UUID) -> list[Expense]:
        query = select(Expense).where(Expense.practice_id == practice_id).order_by(Expense.expense_date.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_expense(self, db: AsyncSession, practice_id: UUID, expense_id: UUID) -> Expense:
        query = select(Expense).where(Expense.id == expense_id, Expense.practice_id == practice_id)
        result = await db.execute(query)
        expense = result.scalar_one_or_none()
        if expense is None:
            raise NotFoundException("Expense not found")
        return expense

    async def update_expense(self, db: AsyncSession, practice_id: UUID, expense_id: UUID, data: UpdateExpenseRequest) -> Expense:
        expense = await self.get_expense(db, practice_id, expense_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(expense, field, value)
        await db.flush()
        await db.refresh(expense)
        return expense

    async def delete_expense(self, db: AsyncSession, practice_id: UUID, expense_id: UUID) -> None:
        expense = await self.get_expense(db, practice_id, expense_id)
        await db.delete(expense)
        await db.flush()

    async def get_overview(self, db: AsyncSession, practice_id: UUID) -> FinanceOverviewResponse:
        total_revenue, invoice_count = (
            await db.execute(
                select(func.coalesce(func.sum(Invoice.total_amount), 0), func.count())
                .where(Invoice.practice_id == practice_id, Invoice.status == InvoiceStatus.PAID)
            )
        ).one()
        total_expenses, expense_count = (
            await db.execute(
                select(func.coalesce(func.sum(Expense.amount), 0), func.count())
                .where(Expense.practice_id == practice_id)
            )
        ).one()

        total_revenue = float(total_revenue)
        total_expenses = float(total_expenses)
        return FinanceOverviewResponse(
            total_revenue=total_revenue,
            total_expenses=total_expenses,
            net=total_revenue - total_expenses,
            invoice_count=invoice_count,
            expense_count=expense_count,
        )
