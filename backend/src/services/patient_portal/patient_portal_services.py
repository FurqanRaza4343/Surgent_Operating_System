from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.models.appointment import Appointment, AppointmentStatus
from src.models.consent_document import ConsentDocument
from src.models.invoice import Invoice, InvoiceStatus
from src.models.patient_photo import PatientPhoto
from src.models.doctor import Doctor
from src.models.treatment_plan import TreatmentPlan, TreatmentPlanItem
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
)
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
