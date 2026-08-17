from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.payment_invoice.payment_invoice_controller import PaymentInvoiceController

router = APIRouter(prefix="/agents/payment_invoice", tags=["Payment Invoice"])
controller = PaymentInvoiceController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
