from src.services.agents.receptionist_agent.receptionist_agent_services import ReceptionistService


class ReceptionistController:
    def __init__(self):
        self.service = ReceptionistService()

    async def process_incoming_call(self, user: dict) -> dict:
        return await self.service.handle_call(user)

    async def transcribe_and_respond(self, user: dict) -> dict:
        return await self.service.transcribe_audio(user)

    async def get_status(self, user: dict) -> dict:
        return {"agent": "receptionist", "status": "active", "user": user.get("sub")}
