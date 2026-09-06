import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class InventoryItem(Base):
    """The SKU catalog — a supply/product a practice stocks (gloves,
    syringes, an implant model, ...). Actual on-hand quantity lives on its
    InventoryBatch rows, not here (see inventory_batch.py) — a catalog entry
    can exist with zero batches (nothing received yet)."""

    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=True)  # e.g. "box", "vial", "pair"
    # Below this on-hand quantity, the item shows as low-stock. Null means
    # no threshold has been set — never flagged low.
    reorder_threshold: Mapped[int] = mapped_column(Integer, nullable=True)
    # Implants (breast implants, etc.) need stricter batch-traceability than
    # a box of gloves — every unit used on a patient must be individually
    # accounted for (see Surgery.implants_used + the consume-on-completion
    # hook in InventoryService.consume). This flag is what a future stricter
    # traceability UI/rule would key off; it doesn't change consume()'s
    # behavior today beyond being available to filter/report on.
    is_implant: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice", back_populates="inventory_items")
    batches = relationship("InventoryBatch", back_populates="item", cascade="all, delete-orphan")
