from fastapi import APIRouter, Depends

from src.server.dependencies import get_current_user
from src.controller.agent.multilingual_translation.multilingual_translation_controller import MultilingualTranslationController

router = APIRouter(prefix="/agents/multilingual_translation", tags=["Multilingual Translation"])
controller = MultilingualTranslationController()


@router.get("/status")
async def agent_status(user: dict = Depends(get_current_user)):
    return await controller.get_status(user)
