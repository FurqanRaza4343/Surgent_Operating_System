from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.pre_surgery_preparation.pre_surgery_preparation_controller import PreSurgeryPreparationController

router = APIRouter(prefix="/agents/pre_surgery_preparation", tags=["Pre-Surgery Preparation"])
controller = PreSurgeryPreparationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
