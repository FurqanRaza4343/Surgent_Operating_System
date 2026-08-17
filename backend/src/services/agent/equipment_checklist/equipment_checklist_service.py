class EquipmentChecklistService:
    def __init__(self):
        pass

    async def get_status(self, user: dict) -> dict:
        return {"agent": "equipment_checklist", "status": "active", "user": user.get("sub")}
