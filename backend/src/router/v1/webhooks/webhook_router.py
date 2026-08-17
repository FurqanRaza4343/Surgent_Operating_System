from fastapi import APIRouter, Request

from src.server.dependencies import get_db

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/clerk")
async def clerk_webhook(request: Request):
    payload = await request.json()
    event_type = payload.get("type")

    if event_type == "user.created":
        pass
    elif event_type == "user.updated":
        pass
    elif event_type == "user.deleted":
        pass

    return {"received": True}


@router.post("/twilio/voice")
async def twilio_voice_webhook(request: Request):
    form = await request.form()
    return {"status": "received"}


@router.post("/twilio/sms")
async def twilio_sms_webhook(request: Request):
    form = await request.form()
    return {"status": "received"}


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    payload = await request.json()
    return {"status": "received"}


@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.json()
    return {"status": "received"}
