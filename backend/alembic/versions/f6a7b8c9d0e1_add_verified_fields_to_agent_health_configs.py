"""add verified fields to agent_health_configs

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-03-24 02:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'agent_health_configs',
        sa.Column('verified', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.add_column(
        'agent_health_configs',
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('agent_health_configs', 'verified_at')
    op.drop_column('agent_health_configs', 'verified')
