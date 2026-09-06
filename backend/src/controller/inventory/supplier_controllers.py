from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.supplier import CreateSupplierRequest, UpdateSupplierRequest, SupplierResponse
from src.services.inventory.supplier_services import SupplierService


class SupplierController:
    def __init__(self):
        self.service = SupplierService()

    async def create_supplier(self, db: AsyncSession, user: User, data: CreateSupplierRequest) -> SupplierResponse:
        supplier = await self.service.create_supplier(db, user.practice_id, data)
        return SupplierResponse.model_validate(supplier)

    async def list_suppliers(self, db: AsyncSession, user: User) -> list[SupplierResponse]:
        suppliers = await self.service.list_suppliers(db, user.practice_id)
        return [SupplierResponse.model_validate(s) for s in suppliers]

    async def get_supplier(self, db: AsyncSession, user: User, supplier_id: UUID) -> SupplierResponse:
        supplier = await self.service.get_supplier(db, user.practice_id, supplier_id)
        return SupplierResponse.model_validate(supplier)

    async def update_supplier(self, db: AsyncSession, user: User, supplier_id: UUID, data: UpdateSupplierRequest) -> SupplierResponse:
        supplier = await self.service.update_supplier(db, user.practice_id, supplier_id, data)
        return SupplierResponse.model_validate(supplier)
