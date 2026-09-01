from __future__ import annotations
import secrets
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.models.appointment import Appointment, AppointmentStatus
from src.models.consent_document import ConsentDocument
from src.models.invoice import Invoice, InvoiceStatus
from src.models.patient_photo import PatientPhoto
from src.schemas.patient_portal import (
    PortalAppointment,
    PortalBookingRequest,
    PortalConsentDocument,
    PortalInvoice,
    PortalPatientResponse,
    PortalPhoto,
)
from src.server.exceptions import NotFoundException, ForbiddenException, AppException

# Frontend origin used to build the shareable portal URL. Kept in lockstep
# with the frontend's /portal/:token route (see frontend/src/App.tsx).
PORTAL_BASE_URL = "http://localhost:5173/portal"


class PatientPortalService:
    """Backs the link-based patient portal (Raasta B demo).

    Two distinct surfaces live here:

    1. Owner-side link generation — practice-scoped, called with the owner's
       practice_id, returns a shareable /portal/:token URL.

    2. Public token lookup — deliberately has NO practice-member dependency.
       The high-entropy `portal_token` IS the credential: anyone who possesses
       the token may read that patient's read-only view. This is fine for a
       demo (the token is unguessable), but the portal must move to real
       per-patient auth (Clerk) before production — see the phase note.

    Security note: the raw token is stored on the Patient row. For a demo
    this is acceptable (secrets.token_urlsafe(32) is unguessable), but a
    production portal must store only a hash of the token.
    """

    # --- Owner-side: generate / manage a link ---------------------------

    async def generate_link(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> str:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        if not patient.portal_token:
            patient.portal_token = secrets.token_urlsafe(32)
        patient.portal_enabled = True
        await db.flush()
        return f"{PORTAL_BASE_URL}/{patient.portal_token}"

    async def revoke_link(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> None:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        patient.portal_token = None
        patient.portal_enabled = False
        await db.flush()

    async def get_link_state(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> tuple[str | None, bool]:
        patient = await self._get_practice_patient(db, practice_id, patient_id)
        url = f"{PORTAL_BASE_URL}/{patient.portal_token}" if patient.portal_token else None
        return url, patient.portal_enabled

    # --- Public side: resolve a token to read-only data -----------------

    async def resolve_token(self, db: AsyncSession, token: str) -> PortalPatientResponse:
        if not token:
            raise NotFoundException("Portal not found")
        result = await db.execute(select(Patient).where(Patient.portal_token == token))
        patient = result.scalar_one_or_none()
        if patient is None or not patient.portal_enabled:
            raise NotFoundException("Portal not found")

        appointments, consents, invoices, photos, pending = await self._load_related(db, patient.id)
        return PortalPatientResponse(
            id=patient.id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            email=patient.email,
            phone=patient.phone,
            chief_complaint=patient.chief_complaint,
            consent_status=patient.consent_status,
            appointments=appointments,
            consent_documents=consents,
            invoices=invoices,
            photos=photos,
            invoice_total_pending=pending,
        )

    # --- Public side: self-serve booking --------------------------------

    async def book_appointment(self, db: AsyncSession, token: str, data: PortalBookingRequest) -> Appointment:
        if not token:
            raise NotFoundException("Portal not found")
        result = await db.execute(select(Patient).where(Patient.portal_token == token))
        patient = result.scalar_one_or_none()
        if patient is None or not patient.portal_enabled:
            raise NotFoundException("Portal not found")

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

    # --- Helpers --------------------------------------------------------

    async def _get_practice_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> Patient:
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id)
        )
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")
        return patient

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
