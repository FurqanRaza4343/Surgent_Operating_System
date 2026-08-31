from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.invoice import InvoiceStatus
from src.schemas.billing import CreateInvoiceRequest, UpdateInvoiceRequest, InvoiceResponse
from src.services.billing.invoice_services import InvoiceService
from src.services.agent_log.agent_log_service import AgentLogService


class BillingController:
    def __init__(self):
        self.invoices = InvoiceService()
        self.agent_log = AgentLogService()

    async def create_invoice(self, db: AsyncSession, user: User, data: CreateInvoiceRequest) -> InvoiceResponse:
        invoice = await self.invoices.create_invoice(db, user.practice_id, data)
        await self.agent_log.log(
            db,
            user.practice_id,
            agent_type="payment_invoice",
            action="invoice_created",
            details={"invoice_id": str(invoice.id), "patient_id": str(invoice.patient_id), "total_amount": float(invoice.total_amount)},
            performed_by=str(user.id),
        )
        return InvoiceResponse.model_validate(invoice)

    async def list_invoices_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[InvoiceResponse]:
        invoices = await self.invoices.list_for_patient(db, user.practice_id, patient_id)
        return [InvoiceResponse.model_validate(i) for i in invoices]

    async def list_invoices_for_practice(self, db: AsyncSession, user: User, status: str | None) -> list[InvoiceResponse]:
        status_enum = InvoiceStatus(status) if status else None
        invoices = await self.invoices.list_for_practice(db, user.practice_id, status_enum)
        return [InvoiceResponse.model_validate(i) for i in invoices]

    async def get_invoice(self, db: AsyncSession, user: User, invoice_id: UUID) -> InvoiceResponse:
        invoice = await self.invoices.get_invoice(db, user.practice_id, invoice_id)
        return InvoiceResponse.model_validate(invoice)

    async def update_invoice(self, db: AsyncSession, user: User, invoice_id: UUID, data: UpdateInvoiceRequest) -> InvoiceResponse:
        was_paid_before = (await self.invoices.get_invoice(db, user.practice_id, invoice_id)).status == InvoiceStatus.PAID
        invoice = await self.invoices.update_invoice(db, user.practice_id, invoice_id, data)
        if invoice.status == InvoiceStatus.PAID and not was_paid_before:
            await self.agent_log.log(
                db,
                user.practice_id,
                agent_type="payment_invoice",
                action="invoice_marked_paid",
                details={"invoice_id": str(invoice.id), "total_amount": float(invoice.total_amount)},
                performed_by=str(user.id),
            )
        return InvoiceResponse.model_validate(invoice)
