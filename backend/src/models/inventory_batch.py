import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class InventoryBatch(Base):
    """One received lot of an InventoryItem — quantity is consumed
    (decremented, never negative) as stock is used, rather than deleting the
    row, so a batch's history (what was received, when, at what expiry)
    stays intact even once it's fully used up."""

    __tablename__ = "inventory_batches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=False)
    lot_number: Mapped[str] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=True)
    received_at: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    item = relationship("InventoryItem", back_populates="batches")
