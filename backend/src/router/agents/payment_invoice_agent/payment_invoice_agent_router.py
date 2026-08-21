from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.payment_invoice_agent.payment_invoice_agent_controllers import PaymentInvoiceController

router = APIRouter(prefix="/agents/payment_invoice", tags=["Payment Invoice"])
controller = PaymentInvoiceController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
