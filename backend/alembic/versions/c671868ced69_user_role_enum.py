"""user role enum

Revision ID: c671868ced69
Revises: c9da7a5261a3
Create Date: 2026-08-29 16:43:26.622007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c671868ced69'
down_revision: Union[str, None] = 'c9da7a5261a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# NOTE: autogenerate also detected the same pre-existing 'uq_agent_config_practice_agent'
# drift flagged in c9da7a5261a3 (model has it, DB doesn't) — deliberately
# left OUT here too, still unrelated to this migration.
#
# SQLAlchemy's Enum(PyEnumClass) stores the member NAME in Postgres (e.g.
# 'OWNER'), not `.value` ('owner') — confirmed by autogenerate's own output
# (`sa.Enum('OWNER', 'DOCTOR', ...)`) and consistent with how Plan.tier /
# Subscription.tier already work in this codebase. The data-migrate step
# below casts the old lowercase free-text values to the new uppercase labels
# accordingly.


def upgrade() -> None:
    userrole = postgresql.ENUM('OWNER', 'DOCTOR', 'RECEPTIONIST', 'STAFF', name='userrole')
    userrole.create(op.get_bind(), checkfirst=True)

    op.add_column('users', sa.Column('role_new', postgresql.ENUM('OWNER', 'DOCTOR', 'RECEPTIONIST', 'STAFF', name='userrole', create_type=False), nullable=True))
    op.execute(
        "UPDATE users SET role_new = CASE "
        "WHEN role = 'owner' THEN 'OWNER'::userrole "
        "WHEN role = 'doctor' THEN 'DOCTOR'::userrole "
        "WHEN role = 'receptionist' THEN 'RECEPTIONIST'::userrole "
        "ELSE 'STAFF'::userrole END"
    )
    op.drop_column('users', 'role')
    op.alter_column('users', 'role_new', new_column_name='role', nullable=False, server_default='STAFF')


def downgrade() -> None:
    op.add_column('users', sa.Column('role_old', sa.String(length=50), nullable=True))
    op.execute("UPDATE users SET role_old = lower(role::text)")
    op.drop_column('users', 'role')
    op.alter_column('users', 'role_old', new_column_name='role', nullable=False, server_default='staff')
    op.execute("DROP TYPE userrole")
