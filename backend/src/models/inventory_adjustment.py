import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, func, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class AdjustmentType(str, enum.Enum):
    RECEIVED = "received"
    CONSUMED = "consumed"
    WASTED = "wasted"
    CORRECTION = "correction"


class InventoryAdjustment(Base):
    """Audit trail for every quantity change on an InventoryBatch —
    received (from a PurchaseOrder), consumed (used on a patient/surgery),
    wasted (expired/damaged/dropped), or correction (manual count fix).
    InventoryBatch.quantity is still the live on-hand number; this table is
    what answers "why did this number change," which the batch row alone
    can't (Week 3's "inventory depth" gap — everything before this only
    tracked point-in-time on-hand quantity, not the history)."""

    __tablename__ = "inventory_adjustments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_batches.id"), nullable=False)
    adjustment_type: Mapped[AdjustmentType] = mapped_column(Enum(AdjustmentType), nullable=False)
    # Always positive — direction is implied by adjustment_type (received
    # adds, consumed/wasted subtract), so a reader never has to remember a
    # sign convention on top of the type.
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Optional link to whatever caused a "consumed" entry — a Surgery today,
    # potentially a TreatmentPlanItem later. Free-form like AuditLog's own
    # resource_type/resource_id pairing, not a hard FK, since the source
    # varies by adjustment type.
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    performed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("InventoryBatch")
