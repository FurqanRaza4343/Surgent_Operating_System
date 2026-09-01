"""add user_id to attendance_records and make doctor_id nullable

Revision ID: b7c8d9e0f1a3
Revises: b7c8d9e0f1a2
Create Date: 2026-09-01 12:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a3'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nullable first so existing doctor-backed rows can be backfilled.
    op.add_column(
        'attendance_records',
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    # Backfill from the linked doctor's owning user.
    op.execute(
        """
        UPDATE attendance_records AS ar
        SET user_id = d.user_id
        FROM doctors AS d
        WHERE ar.doctor_id = d.id
        """
    )
    op.alter_column('attendance_records', 'user_id', nullable=False)
    op.alter_column('attendance_records', 'doctor_id', nullable=True)


def downgrade() -> None:
    op.alter_column('attendance_records', 'doctor_id', nullable=False)
    op.drop_column('attendance_records', 'user_id')