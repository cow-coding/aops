"""add_position_to_chains

Revision ID: a2b3c4d5e6f7
Revises: 0daf3a6f346d
Create Date: 2026-03-04 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = '0daf3a6f346d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chains', sa.Column('position', sa.Integer(), nullable=False, server_default='0'))

    # Assign position based on created_at order within each agent
    op.execute("""
        UPDATE chains c
        SET position = sub.row_num - 1
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY created_at ASC) AS row_num
            FROM chains
        ) sub
        WHERE c.id = sub.id
    """)


def downgrade() -> None:
    op.drop_column('chains', 'position')
