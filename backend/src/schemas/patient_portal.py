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


class PortalBookingRequest(BaseModel):
    appointment_type: str
    start_time: datetime
    end_time: datetime
    notes: str | None = None


class PortalPatientResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    chief_complaint: str | None
    consent_status: bool
    appointments: list[PortalAppointment]
    consent_documents: list[PortalConsentDocument]
    invoices: list[PortalInvoice]
    photos: list[PortalPhoto] = []
    invoice_total_pending: float = 0.0


class PortalLinkResponse(BaseModel):
    portal_url: str
    enabled: bool
