from src.services.agents.implant_inventory_agent.implant_inventory_agent_services import ImplantInventoryService


class ImplantInventoryController:
    def __init__(self):
        self.service = ImplantInventoryService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
