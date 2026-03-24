"""fix health_check_log latency_ms to integer

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-24 01:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change latency_ms from FLOAT to INTEGER to match ChainCallLog.latency_ms."""
    op.alter_column(
        'health_check_logs',
        'latency_ms',
        type_=sa.Integer(),
        existing_type=sa.Float(),
        existing_nullable=True,
        postgresql_using='latency_ms::integer',
    )


def downgrade() -> None:
    op.alter_column(
        'health_check_logs',
        'latency_ms',
        type_=sa.Float(),
        existing_type=sa.Integer(),
        existing_nullable=True,
    )
