"""add doctor time blocks

Revision ID: 740dd822657e
Revises: d1aa4b2c7e05
Create Date: 2026-09-07 19:35:07.562382

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '740dd822657e'
down_revision: Union[str, None] = 'd1aa4b2c7e05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only the new table — autogenerate also picked up unrelated FK/index
    # naming drift on staff_conversations/staff_messages (pre-existing,
    # nothing to do with this change) which was deliberately stripped out
    # rather than bundled into an unrelated migration.
    op.create_table('doctor_time_blocks',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('practice_id', sa.UUID(), nullable=False),
    sa.Column('doctor_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
    sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ),
    sa.ForeignKeyConstraint(['practice_id'], ['practices.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_doctor_time_blocks_doctor_id'), 'doctor_time_blocks', ['doctor_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_doctor_time_blocks_doctor_id'), table_name='doctor_time_blocks')
    op.drop_table('doctor_time_blocks')
