"""add_input_output_to_chain_call_logs

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-03-04 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chain_call_logs', sa.Column('input', sa.Text(), nullable=True))
    op.add_column('chain_call_logs', sa.Column('output', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('chain_call_logs', 'output')
    op.drop_column('chain_call_logs', 'input')
