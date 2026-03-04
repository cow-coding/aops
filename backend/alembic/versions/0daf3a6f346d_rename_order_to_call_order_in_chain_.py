"""rename_order_to_call_order_in_chain_call_logs

Revision ID: 0daf3a6f346d
Revises: 96c81ed8b56c
Create Date: 2026-03-04 15:01:51.356856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0daf3a6f346d'
down_revision: Union[str, Sequence[str], None] = '96c81ed8b56c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('chain_call_logs', 'order', new_column_name='call_order')


def downgrade() -> None:
    op.alter_column('chain_call_logs', 'call_order', new_column_name='order')
