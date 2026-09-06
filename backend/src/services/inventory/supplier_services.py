from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.supplier import Supplier
from src.schemas.supplier import CreateSupplierRequest, UpdateSupplierRequest
from src.server.exceptions import NotFoundException


class SupplierService:
    async def create_supplier(self, db: AsyncSession, practice_id: UUID, data: CreateSupplierRequest) -> Supplier:
        supplier = Supplier(
            practice_id=practice_id, name=data.name, contact_name=data.contact_name,
            phone=data.phone, email=data.email, notes=data.notes,
        )
        db.add(supplier)
        await db.flush()
        await db.refresh(supplier)
        return supplier

    async def list_suppliers(self, db: AsyncSession, practice_id: UUID) -> list[Supplier]:
        result = await db.execute(select(Supplier).where(Supplier.practice_id == practice_id).order_by(Supplier.name))
        return list(result.scalars().all())

    async def get_supplier(self, db: AsyncSession, practice_id: UUID, supplier_id: UUID) -> Supplier:
        result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, Supplier.practice_id == practice_id))
        supplier = result.scalar_one_or_none()
        if supplier is None:
            raise NotFoundException("Supplier not found")
        return supplier

    async def update_supplier(self, db: AsyncSession, practice_id: UUID, supplier_id: UUID, data: UpdateSupplierRequest) -> Supplier:
        supplier = await self.get_supplier(db, practice_id, supplier_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(supplier, field, value)
        await db.flush()
        await db.refresh(supplier)
        return supplier
