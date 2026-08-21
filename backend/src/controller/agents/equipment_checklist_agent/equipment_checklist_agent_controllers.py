from src.services.agents.equipment_checklist_agent.equipment_checklist_agent_services import EquipmentChecklistService


class EquipmentChecklistController:
    def __init__(self):
        self.service = EquipmentChecklistService()

    async def get_status(self, user: dict) -> dict:
        return await self.service.get_status(user)
