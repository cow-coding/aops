"""add_run_edges_table

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-05 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'run_edges',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_chain', sa.String(255), nullable=False),
        sa.Column('target_chain', sa.String(255), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['run_id'], ['agent_runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_run_edges_run_id', 'run_edges', ['run_id'])
    op.create_index(
        'ix_run_edges_agent_src_tgt',
        'run_edges',
        ['agent_id', 'source_chain', 'target_chain'],
    )
    op.create_index(
        'ix_chain_call_logs_agent_run_order',
        'chain_call_logs',
        ['agent_id', 'run_id', 'call_order'],
    )


def downgrade() -> None:
    op.drop_index('ix_chain_call_logs_agent_run_order', table_name='chain_call_logs')
    op.drop_index('ix_run_edges_agent_src_tgt', table_name='run_edges')
    op.drop_index('ix_run_edges_run_id', table_name='run_edges')
    op.drop_table('run_edges')
