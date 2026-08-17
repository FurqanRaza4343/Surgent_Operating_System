class EHRService:
    async def send_patient_data(self, patient_data: dict, ehr_system: str = "generic") -> dict:
        # EHR integration adapter interface
        # Implement for specific EHR systems (PracticeFusion, Athena, etc.)
        return {"status": "not_implemented", "ehr_system": ehr_system, "patient_id": patient_data.get("id")}
