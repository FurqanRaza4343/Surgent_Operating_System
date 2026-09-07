from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.models.practice import Practice
from src.models.appointment import Appointment, AppointmentStatus
from src.models.consent_document import ConsentDocument
from src.models.invoice import Invoice, InvoiceStatus
from src.models.patient_photo import PatientPhoto
from src.models.doctor import Doctor
from src.models.treatment_plan import TreatmentPlan, TreatmentPlanItem
from src.models.conversation import Conversation, ConversationChannel, ConversationStatus
from src.models.message import Message, MessageRole
from src.schemas.patient_portal import (
    PortalAppointment,
    PortalBookingRequest,
    PortalConsentDocument,
    PortalInvoice,
    PortalPatientResponse,
    PortalPhoto,
    PortalDoctorInfo,
    PortalTreatmentPlan,
    PortalTreatmentPlanItem,
    PortalMessage,
)
from src.services.channels.whatsapp_green_api import WhatsAppGreenAPI
from src.server.exceptions import AppException


class PatientPortalService:
    """Read/write data access for a *logged-in* patient (see
    patient_portal_auth_service.py for the login itself — everything here
    takes an already-verified Patient, resolved by the
    get_current_portal_patient dependency, never a raw token)."""

    async def get_my_portal_data(self, db: AsyncSession, patient: Patient) -> PortalPatientResponse:
        appointments, consents, invoices, photos, pending = await self._load_related(db, patient.id)
        doctor = await self._resolve_assigned_doctor(db, patient)
        treatment_plans = await self._load_treatment_plans(db, patient.id)
        return PortalPatientResponse(
            id=patient.id,
            portal_id=patient.portal_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            email=patient.email,
            phone=patient.phone,
            chief_complaint=patient.chief_complaint,
            consent_status=patient.consent_status,
            doctor=doctor,
            appointments=appointments,
            consent_documents=consents,
            invoices=invoices,
            photos=photos,
            treatment_plans=treatment_plans,
            invoice_total_pending=pending,
            intake_completed=patient.intake_summary is not None,
            intake_summary=patient.intake_summary,
        )

    async def book_appointment(self, db: AsyncSession, patient: Patient, data: PortalBookingRequest) -> Appointment:
        if data.end_time <= data.start_time:
            raise AppException("Appointment end time must be after start time")
        if data.start_time < datetime.now(timezone.utc):
            raise AppException("Appointment time must be in the future")

        appointment = Appointment(
            practice_id=patient.practice_id,
            patient_id=patient.id,
            doctor_id=None,
            appointment_type=data.appointment_type,
            status=AppointmentStatus.SCHEDULED,
            start_time=data.start_time,
            end_time=data.end_time,
            notes=data.notes,
        )
        db.add(appointment)
        await db.flush()
        await db.refresh(appointment)
        return appointment

    async def _find_or_create_conversation(self, db: AsyncSession, patient: Patient) -> Conversation:
        # Reuses the exact same conversation the AI receptionist/WhatsApp
        # flow already writes to (agent_type="ai_receptionist") so a
        # patient's portal messages and WhatsApp messages are one continuous
        # thread, not two disconnected inboxes — matches how staff already
        # see everything in one Agent Sessions conversation regardless of
        # which channel a given message came in on.
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.practice_id == patient.practice_id,
                Conversation.patient_id == patient.id,
                Conversation.agent_type == "ai_receptionist",
            )
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing is not None and existing.status != ConversationStatus.RESOLVED:
            return existing

        conversation = Conversation(
            practice_id=patient.practice_id,
            patient_id=patient.id,
            agent_type="ai_receptionist",
            channel=ConversationChannel.WEB_CHAT,
        )
        db.add(conversation)
        await db.flush()
        return conversation

    async def get_messages(self, db: AsyncSession, patient: Patient) -> list[PortalMessage]:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.practice_id == patient.practice_id, Conversation.patient_id == patient.id, Conversation.agent_type == "ai_receptionist")
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        conversation = result.scalar_one_or_none()
        if conversation is None:
            return []
        msg_result = await db.execute(
            select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at)
        )
        return [
            PortalMessage(id=m.id, role=m.role.value, content=m.content, created_at=m.created_at)
            for m in msg_result.scalars().all()
            if m.role != MessageRole.SYSTEM
        ]

    async def send_message(self, db: AsyncSession, patient: Patient, content: str) -> PortalMessage:
        content = content.strip()
        if not content:
            raise AppException("Message can't be empty")

        conversation = await self._find_or_create_conversation(db, patient)
        message = Message(conversation_id=conversation.id, role=MessageRole.PATIENT, content=content, content_type="text")
        db.add(message)
        # A message sent from the portal always needs a human look — unlike
        # WhatsApp, there's no AI-reply pipeline wired to this entry point,
        # so silently leaving it ACTIVE would mean nobody ever gets nudged
        # to answer it.
        conversation.status = ConversationStatus.NEEDS_ATTENTION
        await db.flush()
        await db.refresh(message)

        # Best-effort mirror to WhatsApp too, if that's how this patient
        # normally reaches the clinic — keeps staff's single WhatsApp-based
        # workflow from missing a portal-originated message entirely.
        if conversation.channel == ConversationChannel.WHATSAPP and patient.phone:
            practice_result = await db.execute(select(Practice).where(Practice.id == patient.practice_id))
            practice = practice_result.scalar_one_or_none()
            ga = WhatsAppGreenAPI.from_practice_settings((practice.settings if practice else None) or {})
            if ga is not None:
                try:
                    await ga.send_text(patient.phone, f"[Portal message] {content}")
                except Exception:
                    pass

        return PortalMessage(id=message.id, role=message.role.value, content=message.content, created_at=message.created_at)

    # --- Helpers ----------------------------------------------------------

    async def _resolve_assigned_doctor(self, db: AsyncSession, patient: Patient) -> PortalDoctorInfo | None:
        # "Assigned doctor" = whoever the patient's most recent
        # doctor-carrying appointment points at; falls back to the most
        # recent treatment plan's doctor if no appointment has one yet.
        apt_result = await db.execute(
            select(Doctor)
            .join(Appointment, Appointment.doctor_id == Doctor.id)
            .where(Appointment.patient_id == patient.id, Appointment.doctor_id.isnot(None))
            .order_by(Appointment.start_time.desc())
            .limit(1)
        )
        doctor = apt_result.scalar_one_or_none()
        if doctor is None:
            plan_result = await db.execute(
                select(Doctor)
                .join(TreatmentPlan, TreatmentPlan.doctor_id == Doctor.id)
                .where(TreatmentPlan.patient_id == patient.id)
                .order_by(TreatmentPlan.created_at.desc())
                .limit(1)
            )
            doctor = plan_result.scalar_one_or_none()
        if doctor is None:
            return None
        return PortalDoctorInfo(id=doctor.id, name=doctor.name, specialty=doctor.specialty, bio=doctor.bio, photo_url=doctor.photo_url)

    async def _load_treatment_plans(self, db: AsyncSession, patient_id: UUID) -> list[PortalTreatmentPlan]:
        result = await db.execute(
            select(TreatmentPlan)
            .options(selectinload(TreatmentPlan.items).selectinload(TreatmentPlanItem.procedure))
            .where(TreatmentPlan.patient_id == patient_id)
            .order_by(TreatmentPlan.created_at.desc())
        )
        plans = []
        for plan in result.scalars().all():
            plans.append(
                PortalTreatmentPlan(
                    id=plan.id,
                    title=plan.title,
                    status=plan.status.value if hasattr(plan.status, "value") else str(plan.status),
                    items=[
                        PortalTreatmentPlanItem(
                            id=item.id,
                            procedure_name=item.procedure.name if item.procedure else "Procedure",
                            status=item.status.value if hasattr(item.status, "value") else str(item.status),
                            estimated_price=float(item.estimated_price) if item.estimated_price is not None else None,
                            actual_price=float(item.actual_price) if item.actual_price is not None else None,
                        )
                        for item in plan.items
                    ],
                    created_at=plan.created_at,
                )
            )
        return plans

    async def _load_related(
        self, db: AsyncSession, patient_id: UUID
    ) -> tuple[
        list[PortalAppointment],
        list[PortalConsentDocument],
        list[PortalInvoice],
        list[PortalPhoto],
        float,
    ]:
        apt_result = await db.execute(
            select(Appointment)
            .where(Appointment.patient_id == patient_id)
            .order_by(Appointment.start_time.asc())
        )
        consent_result = await db.execute(
            select(ConsentDocument)
            .where(ConsentDocument.patient_id == patient_id)
            .order_by(ConsentDocument.created_at.desc())
        )
        inv_result = await db.execute(
            select(Invoice)
            .options(selectinload(Invoice.line_items))
            .where(Invoice.patient_id == patient_id)
            .order_by(Invoice.created_at.desc())
        )
        photo_result = await db.execute(
            select(PatientPhoto)
            .where(PatientPhoto.patient_id == patient_id)
            .order_by(PatientPhoto.created_at.desc())
        )

        appointments = [
            PortalAppointment(
                id=a.id,
                appointment_type=a.appointment_type,
                status=a.status.value if hasattr(a.status, "value") else str(a.status),
                start_time=a.start_time,
                end_time=a.end_time,
                notes=a.notes,
            )
            for a in apt_result.scalars().all()
        ]
        consents = [
            PortalConsentDocument(
                id=c.id,
                document_type=c.document_type,
                status=c.status.value if hasattr(c.status, "value") else str(c.status),
                signed_at=c.signed_at,
                signed_by_name=c.signed_by_name,
            )
            for c in consent_result.scalars().all()
        ]
        photos = [
            PortalPhoto(
                id=p.id,
                photo_type=p.photo_type,
                notes=p.notes,
                url=p.cloudinary_url,
                taken_at=p.created_at,
            )
            for p in photo_result.scalars().all()
        ]

        pending = 0.0
        invoices = []
        for i in inv_result.scalars().all():
            if i.status in (InvoiceStatus.PENDING, InvoiceStatus.OVERDUE):
                pending += float(i.total_amount)
            first_line = i.line_items[0].description if i.line_items else "Invoice"
            invoices.append(
                PortalInvoice(
                    id=i.id,
                    description=first_line,
                    total_amount=float(i.total_amount),
                    status=i.status.value if hasattr(i.status, "value") else str(i.status),
                    due_date=i.due_date,
                    created_at=i.created_at,
                )
            )
        return appointments, consents, invoices, photos, round(pending, 2)
