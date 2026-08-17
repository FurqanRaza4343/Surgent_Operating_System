class PaymentInvoiceService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "payment_invoice", "status": "active", "user": user.get("sub")}
