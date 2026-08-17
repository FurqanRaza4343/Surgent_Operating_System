from fastapi import APIRouter

from src.router.v1.agent.receptionist.receptionist_router import router as receptionist_router
from src.router.v1.agent.appointment_booking.appointment_booking_router import router as appointment_booking_router
from src.router.v1.agent.reschedule_cancellation.reschedule_cancellation_router import router as reschedule_cancellation_router
from src.router.v1.agent.appointment_reminder.appointment_reminder_router import router as appointment_reminder_router
from src.router.v1.agent.multilingual_translation.multilingual_translation_router import router as multilingual_translation_router
from src.router.v1.agent.ai_consultation.ai_consultation_router import router as ai_consultation_router
from src.router.v1.agent.photo_analysis.photo_analysis_router import router as photo_analysis_router
from src.router.v1.agent.video_consultation.video_consultation_router import router as video_consultation_router
from src.router.v1.agent.medical_history_intake.medical_history_intake_router import router as medical_history_intake_router
from src.router.v1.agent.risk_assessment.risk_assessment_router import router as risk_assessment_router
from src.router.v1.agent.procedure_recommendation.procedure_recommendation_router import router as procedure_recommendation_router
from src.router.v1.agent.pre_surgery_preparation.pre_surgery_preparation_router import router as pre_surgery_preparation_router
from src.router.v1.agent.surgery_scheduling.surgery_scheduling_router import router as surgery_scheduling_router
from src.router.v1.agent.surgeon_calendar.surgeon_calendar_router import router as surgeon_calendar_router
from src.router.v1.agent.operating_room_scheduler.operating_room_scheduler_router import router as operating_room_scheduler_router
from src.router.v1.agent.equipment_checklist.equipment_checklist_router import router as equipment_checklist_router
from src.router.v1.agent.implant_inventory.implant_inventory_router import router as implant_inventory_router
from src.router.v1.agent.surgical_documentation.surgical_documentation_router import router as surgical_documentation_router
from src.router.v1.agent.recovery_followup.recovery_followup_router import router as recovery_followup_router
from src.router.v1.agent.healing_monitoring.healing_monitoring_router import router as healing_monitoring_router
from src.router.v1.agent.emergency_triage.emergency_triage_router import router as emergency_triage_router
from src.router.v1.agent.medication_reminder.medication_reminder_router import router as medication_reminder_router
from src.router.v1.agent.wound_care_guidance.wound_care_guidance_router import router as wound_care_guidance_router
from src.router.v1.agent.recovery_dashboard.recovery_dashboard_router import router as recovery_dashboard_router
from src.router.v1.agent.cost_estimation.cost_estimation_router import router as cost_estimation_router
from src.router.v1.agent.payment_invoice.payment_invoice_router import router as payment_invoice_router
from src.router.v1.agent.insurance_verification.insurance_verification_router import router as insurance_verification_router
from src.router.v1.agent.analytics_dashboard.analytics_dashboard_router import router as analytics_dashboard_router
from src.router.v1.agent.patient_feedback.patient_feedback_router import router as patient_feedback_router
from src.router.v1.agent.marketing_followup.marketing_followup_router import router as marketing_followup_router
from src.router.v1.agent.lead_nurturing.lead_nurturing_router import router as lead_nurturing_router

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
