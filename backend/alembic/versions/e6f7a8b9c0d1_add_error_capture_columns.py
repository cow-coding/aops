"""add_error_capture_columns

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-03-05 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # agent_runs: status, error_type, error_message
    op.add_column('agent_runs', sa.Column('status', sa.String(20), nullable=False, server_default='success'))
    op.add_column('agent_runs', sa.Column('error_type', sa.String(50), nullable=True))
    op.add_column('agent_runs', sa.Column('error_message', sa.Text(), nullable=True))

    # chain_call_logs: status, error_message
    op.add_column('chain_call_logs', sa.Column('status', sa.String(20), nullable=False, server_default='success'))
    op.add_column('chain_call_logs', sa.Column('error_message', sa.Text(), nullable=True))

    # Backfill: infer status from ended_at for existing agent_runs
    op.execute("UPDATE agent_runs SET status = 'success' WHERE ended_at IS NOT NULL")
    op.execute("UPDATE agent_runs SET status = 'error' WHERE ended_at IS NULL")
    op.execute("UPDATE chain_call_logs SET status = 'success'")


def downgrade() -> None:
    op.drop_column('chain_call_logs', 'error_message')
    op.drop_column('chain_call_logs', 'status')
    op.drop_column('agent_runs', 'error_message')
    op.drop_column('agent_runs', 'error_type')
    op.drop_column('agent_runs', 'status')
