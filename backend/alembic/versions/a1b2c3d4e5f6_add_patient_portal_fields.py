"""add patient portal fields

Revision ID: a1b2c3d4e5f6
Revises: 5e10874d74ba
Create Date: 2026-08-31 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '5e10874d74ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('patients', sa.Column('portal_token', sa.String(length=128), nullable=True))
    op.add_column('patients', sa.Column('portal_enabled', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.create_unique_constraint('uq_patients_portal_token', 'patients', ['portal_token'])


def downgrade() -> None:
    op.drop_constraint('uq_patients_portal_token', 'patients', type_='unique')
    op.drop_column('patients', 'portal_enabled')
    op.drop_column('patients', 'portal_token')
