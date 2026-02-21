"""add_message_to_chain_versions

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-02-21 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add message column as nullable
    op.add_column('chain_versions', sa.Column('message', sa.String(500), nullable=True))

    # Step 2: Backfill existing rows
    op.execute("""
        UPDATE chain_versions
        SET message = CASE
            WHEN version_number = 1 THEN 'Initial version'
            ELSE 'Updated content'
        END
    """)

    # Step 3: Make column NOT NULL
    op.alter_column('chain_versions', 'message', nullable=False)


def downgrade() -> None:
    op.drop_column('chain_versions', 'message')
