from fastapi import APIRouter

from src.router.agents.receptionist_agent.receptionist_agent_router import router as receptionist_router
from src.router.agents.appointment_booking_agent.appointment_booking_agent_router import router as appointment_booking_router
from src.router.agents.reschedule_cancellation_agent.reschedule_cancellation_agent_router import router as reschedule_cancellation_router
from src.router.agents.appointment_reminder_agent.appointment_reminder_agent_router import router as appointment_reminder_router
from src.router.agents.multilingual_translation_agent.multilingual_translation_agent_router import router as multilingual_translation_router
from src.router.agents.ai_consultation_agent.ai_consultation_agent_router import router as ai_consultation_router
from src.router.agents.photo_analysis_agent.photo_analysis_agent_router import router as photo_analysis_router
from src.router.agents.video_consultation_agent.video_consultation_agent_router import router as video_consultation_router
from src.router.agents.medical_history_intake_agent.medical_history_intake_agent_router import router as medical_history_intake_router
from src.router.agents.risk_assessment_agent.risk_assessment_agent_router import router as risk_assessment_router
from src.router.agents.procedure_recommendation_agent.procedure_recommendation_agent_router import router as procedure_recommendation_router
from src.router.agents.pre_surgery_preparation_agent.pre_surgery_preparation_agent_router import router as pre_surgery_preparation_router
from src.router.agents.surgery_scheduling_agent.surgery_scheduling_agent_router import router as surgery_scheduling_router
from src.router.agents.surgeon_calendar_agent.surgeon_calendar_agent_router import router as surgeon_calendar_router
from src.router.agents.operating_room_scheduler_agent.operating_room_scheduler_agent_router import router as operating_room_scheduler_router
from src.router.agents.equipment_checklist_agent.equipment_checklist_agent_router import router as equipment_checklist_router
from src.router.agents.implant_inventory_agent.implant_inventory_agent_router import router as implant_inventory_router
from src.router.agents.surgical_documentation_agent.surgical_documentation_agent_router import router as surgical_documentation_router
from src.router.agents.recovery_followup_agent.recovery_followup_agent_router import router as recovery_followup_router
from src.router.agents.healing_monitoring_agent.healing_monitoring_agent_router import router as healing_monitoring_router
from src.router.agents.emergency_triage_agent.emergency_triage_agent_router import router as emergency_triage_router
from src.router.agents.medication_reminder_agent.medication_reminder_agent_router import router as medication_reminder_router
from src.router.agents.wound_care_guidance_agent.wound_care_guidance_agent_router import router as wound_care_guidance_router
from src.router.agents.recovery_dashboard_agent.recovery_dashboard_agent_router import router as recovery_dashboard_router
from src.router.agents.cost_estimation_agent.cost_estimation_agent_router import router as cost_estimation_router
from src.router.agents.payment_invoice_agent.payment_invoice_agent_router import router as payment_invoice_router
from src.router.agents.insurance_verification_agent.insurance_verification_agent_router import router as insurance_verification_router
from src.router.agents.analytics_dashboard_agent.analytics_dashboard_agent_router import router as analytics_dashboard_router
from src.router.agents.patient_feedback_agent.patient_feedback_agent_router import router as patient_feedback_router
from src.router.agents.marketing_followup_agent.marketing_followup_agent_router import router as marketing_followup_router
from src.router.agents.lead_nurturing_agent.lead_nurturing_agent_router import router as lead_nurturing_router

from src.router.v1.webhooks.webhook_router import router as webhook_router

agent_routers = [
    receptionist_router,
    appointment_booking_router,
    reschedule_cancellation_router,
    appointment_reminder_router,
    multilingual_translation_router,
    ai_consultation_router,
    photo_analysis_router,
    video_consultation_router,
    medical_history_intake_router,
    risk_assessment_router,
    procedure_recommendation_router,
    pre_surgery_preparation_router,
    surgery_scheduling_router,
    surgeon_calendar_router,
    operating_room_scheduler_router,
    equipment_checklist_router,
    implant_inventory_router,
    surgical_documentation_router,
    recovery_followup_router,
    healing_monitoring_router,
    emergency_triage_router,
    medication_reminder_router,
    wound_care_guidance_router,
    recovery_dashboard_router,
    cost_estimation_router,
    payment_invoice_router,
    insurance_verification_router,
    analytics_dashboard_router,
    patient_feedback_router,
    marketing_followup_router,
    lead_nurturing_router,
    webhook_router,
]


def register_routes(app):
    for router in agent_routers:
        app.include_router(router, prefix="/api/v1")
