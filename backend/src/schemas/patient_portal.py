from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class PortalAppointment(BaseModel):
    id: UUID
    appointment_type: str
    status: str
    start_time: datetime
    end_time: datetime
    notes: str | None


class PortalConsentDocument(BaseModel):
    id: UUID
    document_type: str
    status: str
    signed_at: datetime | None
    signed_by_name: str | None


class PortalInvoice(BaseModel):
    id: UUID
    description: str
    total_amount: float
    status: str
    due_date: date | None
    created_at: datetime


class PortalPhoto(BaseModel):
    id: UUID
    photo_type: str | None
    notes: str | None
    url: str
    taken_at: datetime


class PortalDoctorInfo(BaseModel):
    id: UUID
    name: str
    specialty: str | None
    bio: str | None
    photo_url: str | None


class PortalTreatmentPlanItem(BaseModel):
    id: UUID
    procedure_name: str
    status: str
    estimated_price: float | None
    actual_price: float | None


class PortalTreatmentPlan(BaseModel):
    id: UUID
    title: str
    status: str
    items: list[PortalTreatmentPlanItem]
    created_at: datetime


class PortalBookingRequest(BaseModel):
    appointment_type: str
    start_time: datetime
    end_time: datetime
    notes: str | None = None


class PortalPatientResponse(BaseModel):
    id: UUID
    portal_id: str | None
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    chief_complaint: str | None
    consent_status: bool
    doctor: PortalDoctorInfo | None
    appointments: list[PortalAppointment]
    consent_documents: list[PortalConsentDocument]
    invoices: list[PortalInvoice]
    photos: list[PortalPhoto] = []
    treatment_plans: list[PortalTreatmentPlan] = []
    invoice_total_pending: float = 0.0


# --- Owner/staff-side portal management ---

class PortalAccessResponse(BaseModel):
    portal_id: str | None
    enabled: bool


class PortalPinIssuedResponse(BaseModel):
    """Returned exactly once, right after enabling the portal or resetting
    a PIN — the plaintext PIN is never stored or retrievable again after
    this response, matching the model's own bcrypt-hash-only storage."""
    portal_id: str
    pin: str


# --- Patient-side login ---

class PatientPortalLoginRequest(BaseModel):
    portal_id: str
    pin: str


class PatientPortalLoginResponse(BaseModel):
    access_token: str
    expires_in_minutes: int
