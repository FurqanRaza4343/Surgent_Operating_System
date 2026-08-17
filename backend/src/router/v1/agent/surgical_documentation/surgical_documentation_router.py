from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.surgical_documentation.surgical_documentation_controller import SurgicalDocumentationController

router = APIRouter(prefix="/agents/surgical_documentation", tags=["Surgical Documentation"])
controller = SurgicalDocumentationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
