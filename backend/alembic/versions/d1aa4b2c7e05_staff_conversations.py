"""1:1 staff chat — conversations table, reworked staff_messages

Revision ID: d1aa4b2c7e05
Revises: 9c41f7d2ab10
Create Date: 2026-09-07 00:00:00.000000

Replaces the old Owner-vs-staff thread model (thread = every staff_messages
row sharing a practice_id + staff_user_id) with a real conversation table
between any two practice users. Staff messages now belong to a
conversation instead of carrying an implicit staff_user_id; the old table
is dropped and recreated with the new shape.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1aa4b2c7e05'
down_revision: Union[str, None] = '4e24e74ecd6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('staff_conversations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('practice_id', sa.UUID(), nullable=False),
        sa.Column('user_a_id', sa.UUID(), nullable=False),
        sa.Column('user_b_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['practice_id'], ['practices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_a_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_b_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('practice_id', 'user_a_id', 'user_b_id', name='uq_staff_conversations_pair'),
    )
    # Participants are stored in canonical order (user_a_id < user_b_id), so
    # the pair can never be duplicated in either direction.
    op.create_index('ix_staff_conversations_practice_id', 'staff_conversations', ['practice_id'])

    op.drop_table('staff_messages')

    op.create_table('staff_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('practice_id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['practice_id'], ['practices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['conversation_id'], ['staff_conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_staff_messages_conversation_id', 'staff_messages', ['conversation_id'])


def downgrade() -> None:
    op.drop_index('ix_staff_messages_conversation_id', 'staff_messages')
    op.drop_table('staff_messages')

    op.create_table('staff_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('practice_id', sa.UUID(), nullable=False),
        sa.Column('staff_user_id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['practice_id'], ['practices.id'], ),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['staff_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.drop_index('ix_staff_conversations_practice_id', 'staff_conversations')
    op.drop_table('staff_conversations')