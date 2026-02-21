"""refactor_chains_remove_prompts

Revision ID: a1b2c3d4e5f6
Revises: 566bd979d884
Create Date: 2026-02-21 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '566bd979d884'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add persona/content to chains, create chain_versions, migrate data, drop prompts."""
    # Step 1: Add persona and content columns to chains (nullable initially for backfill)
    op.add_column('chains', sa.Column('persona', sa.String(255), nullable=True))
    op.add_column('chains', sa.Column('content', sa.Text(), nullable=True))

    # Step 2: Create chain_versions table
    op.create_table(
        'chain_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('chain_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('persona', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Step 3: Backfill chains from their first prompt (if any)
    op.execute("""
        UPDATE chains c
        SET persona = p.role,
            content = p.content
        FROM (
            SELECT DISTINCT ON (chain_id) chain_id, role, content
            FROM prompts
            ORDER BY chain_id, created_at ASC
        ) p
        WHERE c.id = p.chain_id
    """)

    # Set defaults for chains that had no prompts
    op.execute("""
        UPDATE chains
        SET persona = 'assistant',
            content = ''
        WHERE persona IS NULL
    """)

    # Step 4: Make columns NOT NULL
    op.alter_column('chains', 'persona', nullable=False)
    op.alter_column('chains', 'content', nullable=False)

    # Step 5: Migrate prompt_versions to chain_versions
    op.execute("""
        INSERT INTO chain_versions (id, chain_id, persona, content, version_number, created_at)
        SELECT pv.id, p.chain_id, pv.role, pv.content, pv.version_number, pv.created_at
        FROM prompt_versions pv
        JOIN prompts p ON pv.prompt_id = p.id
    """)

    # Step 6: Drop old tables
    op.drop_table('prompt_versions')
    op.drop_table('prompts')


def downgrade() -> None:
    """Reverse: recreate prompts/prompt_versions, migrate data back, drop chain columns."""
    # Recreate prompts table
    op.create_table(
        'prompts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('chain_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('chains.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Recreate prompt_versions table
    op.create_table(
        'prompt_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('prompt_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('prompts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Backfill prompts from chains
    op.execute("""
        INSERT INTO prompts (id, chain_id, role, content, created_at, updated_at)
        SELECT gen_random_uuid(), id, persona, content, created_at, updated_at
        FROM chains
    """)

    # Backfill prompt_versions from chain_versions
    op.execute("""
        INSERT INTO prompt_versions (id, prompt_id, role, content, version_number, created_at)
        SELECT cv.id, p.id, cv.persona, cv.content, cv.version_number, cv.created_at
        FROM chain_versions cv
        JOIN prompts p ON cv.chain_id = p.chain_id
    """)

    # Drop chain_versions and remove columns
    op.drop_table('chain_versions')
    op.drop_column('chains', 'content')
    op.drop_column('chains', 'persona')
