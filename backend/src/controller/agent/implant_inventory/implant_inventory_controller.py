from src.services.agent.implant_inventory.implant_inventory_service import ImplantInventoryService


class ImplantInventoryController:
    def __init__(self):
        self.service = ImplantInventoryService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
