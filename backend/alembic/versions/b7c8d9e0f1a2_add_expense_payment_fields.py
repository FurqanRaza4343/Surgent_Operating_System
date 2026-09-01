"""add expense payment fields

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-09-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('expenses', sa.Column('expense_type', sa.String(length=20), server_default='expense', nullable=False))
    op.add_column('expenses', sa.Column('status', sa.String(length=20), server_default='paid', nullable=False))
    op.add_column('expenses', sa.Column('payee_name', sa.String(length=255), nullable=True))
    op.add_column('expenses', sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('expenses', 'paid_at')
    op.drop_column('expenses', 'payee_name')
    op.drop_column('expenses', 'status')
    op.drop_column('expenses', 'expense_type')
