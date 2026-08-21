from src.services.agents.payment_invoice_agent.payment_invoice_agent_services import PaymentInvoiceService


class PaymentInvoiceController:
    def __init__(self):
        self.service = PaymentInvoiceService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
