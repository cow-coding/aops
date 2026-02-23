"""make_persona_nullable

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("chains", "persona", existing_type=sa.String(255), nullable=True)
    op.alter_column("chain_versions", "persona", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE chains SET persona = '' WHERE persona IS NULL")
    op.execute("UPDATE chain_versions SET persona = '' WHERE persona IS NULL")
    op.alter_column("chains", "persona", existing_type=sa.String(255), nullable=False)
    op.alter_column("chain_versions", "persona", existing_type=sa.String(255), nullable=False)
