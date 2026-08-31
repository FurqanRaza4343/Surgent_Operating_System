"""receptionist permissions and appointment check-in

Revision ID: c6060f88ed72
Revises: 98a1f2249f4a
Create Date: 2026-08-30 12:01:24.183065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c6060f88ed72'
down_revision: Union[str, None] = '98a1f2249f4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Autogenerate doesn't detect Python enum member additions (only column/
    # table diffs) — same gotcha as c671868ced69's user role enum. Adding a
    # value to an existing Postgres enum type is safe inside a transaction as
    # long as nothing in this same transaction USES the new value yet (PG 12+),
    # which holds here.
    op.execute("ALTER TYPE appointmentstatus ADD VALUE IF NOT EXISTS 'CHECKED_IN'")

    op.add_column('appointments', sa.Column('checked_in_at', sa.DateTime(timezone=True), nullable=True))
    # server_default matters here (unlike doctors.permissions in 98a1f2249f4a,
    # where the table was still empty) — users already has real rows.
    op.add_column(
        'users',
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )


def downgrade() -> None:
    op.drop_column('users', 'permissions')
    op.drop_column('appointments', 'checked_in_at')
    # Postgres has no ALTER TYPE ... DROP VALUE — removing 'CHECKED_IN' would
    # require rebuilding the enum type, deliberately not attempted here (same
    # as this codebase's other enum-extension migrations).
