"""add_covering_index_agent_runs_stats

Revision ID: c3d4e5f6a7b8
Revises: a8b9c0d1e2f3
Create Date: 2026-03-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'a8b9c0d1e2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Covering index for stats queries: filters on (agent_id, started_at)
    # and aggregates on (status, ended_at) without extra heap lookups.
    # Replaces the narrower ix_agent_runs_agent_id_started_at index.
    op.drop_index('ix_agent_runs_agent_id_started_at', table_name='agent_runs')
    op.create_index(
        'ix_agent_runs_stats',
        'agent_runs',
        ['agent_id', 'started_at', 'status', 'ended_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_agent_runs_stats', table_name='agent_runs')
    op.create_index(
        'ix_agent_runs_agent_id_started_at',
        'agent_runs',
        ['agent_id', 'started_at'],
    )
