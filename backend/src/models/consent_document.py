import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Integer, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class ConsentDocumentStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"
    VOID = "void"


class ConsentDocument(Base):
    """A real, per-document consent record — replaces `Patient.consent_status`
    being the only signal (kept as a denormalized flag, recomputed whenever a
    document here is signed, so existing reads of it keep working).

    Signing model (a deliberate, non-default choice — see the memory note
    from when this was decided): staff-captured typed-name e-signature. The
    patient is physically present with a staff member, types their full
    legal name into a field, and the staff member who witnessed it is
    recorded — not a mailed-out third-party e-sign flow (no Patient Portal
    exists yet to receive one) and not a scanned-paper upload (no audit
    trail of who actually signed). `signed_by_name` is patient-entered
    free text, not verified identity — the same trust model a paper
    clipboard has."""

    __tablename__ = "consent_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    document_type: Mapped[str] = mapped_column(String(255), nullable=False)
    # The actual consent text shown to the patient at signing time — a
    # snapshot, not a live template reference, so a later template edit
    # never rewrites what someone already agreed to.
    content: Mapped[str] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[ConsentDocumentStatus] = mapped_column(Enum(ConsentDocumentStatus), default=ConsentDocumentStatus.DRAFT)
    signed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_by_name: Mapped[str] = mapped_column(String(255), nullable=True)
    witnessed_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice", back_populates="consent_documents")
    patient = relationship("Patient", back_populates="consent_documents")
    witness = relationship("User")
