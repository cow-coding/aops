"""add_idx_chain_call_logs_agent_id_called_at

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-03-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_chain_call_logs_agent_id_called_at",
        "chain_call_logs",
        ["agent_id", "called_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_chain_call_logs_agent_id_called_at", table_name="chain_call_logs")
