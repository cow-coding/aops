"""add_idx_agent_runs_agent_started_at

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-03-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a8b9c0d1e2f3'
down_revision: Union[str, Sequence[str], None] = 'f7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_agent_runs_agent_id_started_at',
        'agent_runs',
        ['agent_id', 'started_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_agent_runs_agent_id_started_at', table_name='agent_runs')
