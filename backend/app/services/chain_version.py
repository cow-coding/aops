import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chain_version import ChainVersion


async def get_versions(db: AsyncSession, chain_id: uuid.UUID) -> list[ChainVersion]:
    result = await db.execute(
        select(ChainVersion)
        .where(ChainVersion.chain_id == chain_id)
        .order_by(ChainVersion.version_number.desc())
    )
    return list(result.scalars().all())


async def get_version(db: AsyncSession, version_id: uuid.UUID) -> ChainVersion | None:
    return await db.get(ChainVersion, version_id)
