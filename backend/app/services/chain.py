import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_run import ChainCallLog
from app.models.chain import Chain
from app.models.chain_version import ChainVersion
from app.schemas.chain import ChainCreate, ChainUpdate


async def _next_version_number(db: AsyncSession, chain_id: uuid.UUID) -> int:
    result = await db.execute(
        select(ChainVersion)
        .where(ChainVersion.chain_id == chain_id)
        .order_by(ChainVersion.version_number.desc())
    )
    latest = result.scalars().first()
    return (latest.version_number + 1) if latest else 1


async def get_chains(db: AsyncSession, agent_id: uuid.UUID) -> list[Chain]:
    result = await db.execute(
        select(Chain).where(Chain.agent_id == agent_id).order_by(Chain.position.asc())
    )
    return list(result.scalars().all())


async def get_chain(db: AsyncSession, chain_id: uuid.UUID) -> Chain | None:
    return await db.get(Chain, chain_id)


async def create_chain(db: AsyncSession, agent_id: uuid.UUID, data: ChainCreate) -> Chain:
    chain_data = data.model_dump(exclude={"message"})
    chain = Chain(agent_id=agent_id, **chain_data)
    db.add(chain)
    await db.flush()

    version = ChainVersion(
        chain_id=chain.id,
        persona=chain.persona,
        content=chain.content,
        message=data.message,
        version_number=1,
    )
    db.add(version)
    await db.commit()
    await db.refresh(chain)
    return chain


async def update_chain(db: AsyncSession, chain: Chain, data: ChainUpdate) -> Chain:
    update_data = data.model_dump(exclude_unset=True)
    message = update_data.pop("message", None) or "Updated content"
    changed_persona = update_data.get("persona", chain.persona)
    changed_content = update_data.get("content", chain.content)

    persona_changed = changed_persona != chain.persona
    content_changed = changed_content != chain.content

    for key, value in update_data.items():
        setattr(chain, key, value)

    if persona_changed or content_changed:
        next_version = await _next_version_number(db, chain.id)

        version = ChainVersion(
            chain_id=chain.id,
            persona=chain.persona,
            content=chain.content,
            message=message,
            version_number=next_version,
        )
        db.add(version)

    await db.commit()
    await db.refresh(chain)
    return chain


async def rollback_chain(db: AsyncSession, chain: Chain, target_version: ChainVersion) -> Chain:
    chain.persona = target_version.persona
    chain.content = target_version.content

    next_version = await _next_version_number(db, chain.id)

    new_version = ChainVersion(
        chain_id=chain.id,
        persona=target_version.persona,
        content=target_version.content,
        message=f"Revert to v{target_version.version_number}",
        version_number=next_version,
    )
    db.add(new_version)
    await db.commit()
    await db.refresh(chain)
    return chain


async def delete_chain(db: AsyncSession, chain: Chain) -> None:
    await db.delete(chain)
    await db.commit()


async def get_chain_stats(db: AsyncSession, chain_id: uuid.UUID) -> dict:
    # chain_call_logs has no chain_id FK; join via chain_name + agent_id
    chain_filter = (
        select(ChainCallLog)
        .join(Chain, (ChainCallLog.chain_name == Chain.name) & (ChainCallLog.agent_id == Chain.agent_id))
        .where(Chain.id == chain_id)
        .subquery()
    )
    logs = chain_filter.c

    result = await db.execute(
        select(
            func.count().label("total_calls"),
            func.count(logs.run_id.distinct()).label("runs_appeared_in"),
            func.avg(logs.latency_ms).label("avg_latency_ms"),
            func.percentile_cont(0.95).within_group(logs.latency_ms.asc()).label("p95_latency_ms"),
            func.max(logs.called_at).label("last_called_at"),
        )
    )
    row = result.one()
    return {
        "total_calls": row.total_calls,
        "runs_appeared_in": row.runs_appeared_in,
        "avg_latency_ms": float(row.avg_latency_ms) if row.avg_latency_ms is not None else None,
        "p95_latency_ms": float(row.p95_latency_ms) if row.p95_latency_ms is not None else None,
        "last_called_at": row.last_called_at,
    }


async def get_chain_logs(
    db: AsyncSession, chain_id: uuid.UUID, limit: int, offset: int
) -> list[ChainCallLog]:
    result = await db.execute(
        select(ChainCallLog)
        .join(Chain, (ChainCallLog.chain_name == Chain.name) & (ChainCallLog.agent_id == Chain.agent_id))
        .where(Chain.id == chain_id)
        .order_by(ChainCallLog.called_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def reorder_chains(
    db: AsyncSession, agent_id: uuid.UUID, chain_ids: list[uuid.UUID]
) -> None:
    result = await db.execute(
        select(Chain).where(Chain.agent_id == agent_id)
    )
    chains_by_id = {c.id: c for c in result.scalars().all()}

    for position, chain_id in enumerate(chain_ids):
        chain = chains_by_id.get(chain_id)
        if chain is not None:
            chain.position = position

    await db.commit()
