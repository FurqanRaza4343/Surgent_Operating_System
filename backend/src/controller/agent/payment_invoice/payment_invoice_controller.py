from src.services.agent.payment_invoice.payment_invoice_service import PaymentInvoiceService


class PaymentInvoiceController:
    def __init__(self):
        self.service = PaymentInvoiceService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
