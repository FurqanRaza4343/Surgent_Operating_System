from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.insurance_verification.insurance_verification_controller import InsuranceVerificationController

router = APIRouter(prefix="/agents/insurance_verification", tags=["Insurance Verification"])
controller = InsuranceVerificationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
