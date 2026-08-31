from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.models.patient import Patient
from src.models.treatment_plan import TreatmentPlan, TreatmentPlanItem
from src.schemas.billing import CreateInvoiceRequest, UpdateInvoiceRequest
from src.server.exceptions import NotFoundException, AppException


class InvoiceService:
    """Patient billing — an invoice is either raised ad-hoc (caller supplies
    line items directly) or generated from a treatment plan's items (caller
    supplies `treatment_plan_id` with no explicit items). Every method is
    practice-scoped."""

    async def _resolve_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> Patient:
        result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")
        return patient

    async def _lines_from_treatment_plan(
        self, db: AsyncSession, practice_id: UUID, treatment_plan_id: UUID
    ) -> list[InvoiceLineItem]:
        query = (
            select(TreatmentPlan)
            .options(selectinload(TreatmentPlan.items).selectinload(TreatmentPlanItem.procedure))
            .where(TreatmentPlan.id == treatment_plan_id, TreatmentPlan.practice_id == practice_id)
        )
        result = await db.execute(query)
        plan = result.scalar_one_or_none()
        if plan is None:
            raise NotFoundException("Treatment plan not found")
        if not plan.items:
            raise AppException("This treatment plan has no items to invoice.")

        lines = []
        for item in plan.items:
            price = item.actual_price if item.actual_price is not None else item.estimated_price
            if price is None:
                price = item.procedure.base_price
            if price is None:
                raise AppException(f"'{item.procedure.name}' has no price set — add one before invoicing.")
            lines.append(
                InvoiceLineItem(
                    treatment_plan_item_id=item.id,
                    description=item.procedure.name,
                    quantity=1,
                    unit_price=price,
                )
            )
        return lines

    async def create_invoice(self, db: AsyncSession, practice_id: UUID, data: CreateInvoiceRequest) -> Invoice:
        await self._resolve_patient(db, practice_id, data.patient_id)

        if data.line_items:
            lines = [
                InvoiceLineItem(
                    treatment_plan_item_id=li.treatment_plan_item_id,
                    description=li.description,
                    quantity=li.quantity,
                    unit_price=li.unit_price,
                )
                for li in data.line_items
            ]
        elif data.treatment_plan_id:
            lines = await self._lines_from_treatment_plan(db, practice_id, data.treatment_plan_id)
        else:
            raise AppException("An invoice needs at least one line item or a treatment plan to bill from.")

        subtotal = sum(line.quantity * float(line.unit_price) for line in lines)
        total = subtotal + data.tax_amount - data.discount_amount

        invoice = Invoice(
            practice_id=practice_id,
            patient_id=data.patient_id,
            appointment_id=data.appointment_id,
            treatment_plan_id=data.treatment_plan_id,
            subtotal_amount=subtotal,
            tax_amount=data.tax_amount,
            discount_amount=data.discount_amount,
            total_amount=total,
            due_date=data.due_date,
            line_items=lines,
        )
        db.add(invoice)
        await db.flush()
        return await self.get_invoice(db, practice_id, invoice.id)

    async def list_for_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> list[Invoice]:
        query = (
            select(Invoice)
            .options(selectinload(Invoice.line_items))
            .where(Invoice.practice_id == practice_id, Invoice.patient_id == patient_id)
            .order_by(Invoice.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def list_for_practice(
        self, db: AsyncSession, practice_id: UUID, status: InvoiceStatus | None = None
    ) -> list[Invoice]:
        query = select(Invoice).options(selectinload(Invoice.line_items)).where(Invoice.practice_id == practice_id)
        if status is not None:
            query = query.where(Invoice.status == status)
        query = query.order_by(Invoice.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_invoice(self, db: AsyncSession, practice_id: UUID, invoice_id: UUID) -> Invoice:
        query = (
            select(Invoice)
            .options(selectinload(Invoice.line_items))
            .where(Invoice.id == invoice_id, Invoice.practice_id == practice_id)
        )
        result = await db.execute(query)
        invoice = result.scalar_one_or_none()
        if invoice is None:
            raise NotFoundException("Invoice not found")
        return invoice

    async def update_invoice(
        self, db: AsyncSession, practice_id: UUID, invoice_id: UUID, data: UpdateInvoiceRequest
    ) -> Invoice:
        invoice = await self.get_invoice(db, practice_id, invoice_id)
        fields = data.model_dump(exclude_unset=True)

        if "status" in fields:
            new_status = InvoiceStatus(fields["status"])
            fields["status"] = new_status
            # First transition into PAID stamps paid_at — flipping status
            # back and forth doesn't keep re-stamping it.
            if new_status == InvoiceStatus.PAID and invoice.paid_at is None:
                fields["paid_at"] = datetime.now(timezone.utc)

        for field, value in fields.items():
            setattr(invoice, field, value)

        # tax/discount edits change what's owed — total_amount is a snapshot,
        # not a computed column, so it needs recomputing here.
        if "tax_amount" in fields or "discount_amount" in fields:
            invoice.total_amount = float(invoice.subtotal_amount) + float(invoice.tax_amount) - float(invoice.discount_amount)

        await db.flush()
        return await self.get_invoice(db, practice_id, invoice_id)
