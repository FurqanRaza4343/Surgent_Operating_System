from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.surgical_documentation_agent.surgical_documentation_agent_controllers import SurgicalDocumentationController

router = APIRouter(prefix="/agents/surgical_documentation", tags=["Surgical Documentation"])
controller = SurgicalDocumentationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
