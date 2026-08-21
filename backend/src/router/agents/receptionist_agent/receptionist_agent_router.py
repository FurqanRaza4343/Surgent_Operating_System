from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agents.receptionist_agent.receptionist_agent_controllers import ReceptionistController

router = APIRouter(prefix="/agents/receptionist", tags=["Receptionist"])
controller = ReceptionistController()


@router.post("/handle-call")
async def handle_incoming_call(user: dict = Depends(get_current_user)):
    return await controller.process_incoming_call(user)


@router.post("/transcribe")
async def transcribe_call(user: dict = Depends(get_current_user)):
    return await controller.transcribe_and_respond(user)


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
