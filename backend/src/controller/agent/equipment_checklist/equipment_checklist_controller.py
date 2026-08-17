from src.services.agent.equipment_checklist.equipment_checklist_service import EquipmentChecklistService


class EquipmentChecklistController:
    def __init__(self):
        self.service = EquipmentChecklistService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
