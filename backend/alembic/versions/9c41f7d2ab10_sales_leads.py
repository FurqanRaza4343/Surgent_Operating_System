"""sales leads table (platform landing-chat pipeline)

Revision ID: 9c41f7d2ab10
Revises: 637981c7f7dc
Create Date: 2026-09-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c41f7d2ab10'
down_revision: Union[str, None] = '637981c7f7dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('sales_leads',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('source', sa.Enum('ARIA_LANDING_CHAT', name='salesleadsource'), nullable=False),
        sa.Column('status', sa.Enum('NEW', 'CONTACTED', 'CONVERTED', 'LOST', name='salesleadstatus'), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    # Platform landing-chat sales conversations aren't scoped to a clinic's
    # practice, so conversations.practice_id becomes nullable.
    op.alter_column('conversations', 'practice_id',
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column('conversations', 'practice_id',
        existing_type=sa.UUID(),
        nullable=False,
    )
    op.drop_table('sales_leads')