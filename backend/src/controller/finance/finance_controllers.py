from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.finance import CreateExpenseRequest, UpdateExpenseRequest, ExpenseResponse, FinanceOverviewResponse
from src.services.finance.finance_services import FinanceService


class FinanceController:
    def __init__(self):
        self.finance = FinanceService()

    async def create_expense(self, db: AsyncSession, user: User, data: CreateExpenseRequest) -> ExpenseResponse:
        expense = await self.finance.create_expense(db, user.practice_id, user.id, data)
        return ExpenseResponse.model_validate(expense)

    async def list_expenses(self, db: AsyncSession, user: User) -> list[ExpenseResponse]:
        expenses = await self.finance.list_expenses(db, user.practice_id)
        return [ExpenseResponse.model_validate(e) for e in expenses]

    async def get_expense(self, db: AsyncSession, user: User, expense_id: UUID) -> ExpenseResponse:
        expense = await self.finance.get_expense(db, user.practice_id, expense_id)
        return ExpenseResponse.model_validate(expense)

    async def update_expense(self, db: AsyncSession, user: User, expense_id: UUID, data: UpdateExpenseRequest) -> ExpenseResponse:
        expense = await self.finance.update_expense(db, user.practice_id, expense_id, data)
        return ExpenseResponse.model_validate(expense)

    async def delete_expense(self, db: AsyncSession, user: User, expense_id: UUID) -> None:
        await self.finance.delete_expense(db, user.practice_id, expense_id)

    async def get_overview(self, db: AsyncSession, user: User) -> FinanceOverviewResponse:
        return await self.finance.get_overview(db, user.practice_id)
