"""add agent_health_configs and health_check_logs tables

Revision ID: d4e5f6a7b8c9
Revises: c31dc371d24b
Create Date: 2026-03-24 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c31dc371d24b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'agent_health_configs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('health_url', sa.String(2048), nullable=False),
        sa.Column('interval_sec', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('timeout_sec', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('consecutive_failures_threshold', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('agent_id', name='uq_agent_health_configs_agent_id'),
    )
    op.create_index('ix_agent_health_configs_agent_id', 'agent_health_configs', ['agent_id'])

    op.create_table(
        'health_check_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('checked_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_health_check_logs_agent_id', 'health_check_logs', ['agent_id'])
    op.create_index('ix_health_check_logs_checked_at', 'health_check_logs', ['checked_at'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_health_check_logs_checked_at', table_name='health_check_logs')
    op.drop_index('ix_health_check_logs_agent_id', table_name='health_check_logs')
    op.drop_table('health_check_logs')

    op.drop_index('ix_agent_health_configs_agent_id', table_name='agent_health_configs')
    op.drop_table('agent_health_configs')
