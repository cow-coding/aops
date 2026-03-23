import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, literal_column, select
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


async def get_chain_stats(
    db: AsyncSession,
    chain_id: uuid.UUID,
    started_after: datetime | None = None,
    started_before: datetime | None = None,
) -> dict:
    # chain_call_logs has no chain_id FK; join via chain_name + agent_id
    chain_filter = (
        select(ChainCallLog)
        .join(Chain, (ChainCallLog.chain_name == Chain.name) & (ChainCallLog.agent_id == Chain.agent_id))
        .where(Chain.id == chain_id)
    )
    if started_after is not None:
        chain_filter = chain_filter.where(ChainCallLog.called_at >= started_after)
    if started_before is not None:
        chain_filter = chain_filter.where(ChainCallLog.called_at < started_before)

    logs = chain_filter.subquery().c

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
    db: AsyncSession,
    chain_id: uuid.UUID,
    limit: int,
    offset: int,
    slow_only: bool = False,
) -> tuple[list[ChainCallLog], int]:
    base_join = (
        select(ChainCallLog)
        .join(
            Chain,
            (ChainCallLog.chain_name == Chain.name) & (ChainCallLog.agent_id == Chain.agent_id),
        )
        .where(Chain.id == chain_id)
    )

    if slow_only:
        # Compute p95 for this chain (all-time) as a scalar subquery, then filter above it
        p95_subq = (
            select(
                func.percentile_cont(0.95).within_group(ChainCallLog.latency_ms.asc())
            )
            .join(
                Chain,
                (ChainCallLog.chain_name == Chain.name)
                & (ChainCallLog.agent_id == Chain.agent_id),
            )
            .where(Chain.id == chain_id)
            .where(ChainCallLog.latency_ms.isnot(None))
            .scalar_subquery()
        )
        base_join = base_join.where(ChainCallLog.latency_ms > p95_subq)

    total = (await db.execute(select(func.count()).select_from(base_join.subquery()))).scalar_one()

    items = list(
        (
            await db.execute(
                base_join.order_by(ChainCallLog.called_at.desc()).limit(limit).offset(offset)
            )
        ).scalars().all()
    )
    return items, total


_RANGE_CONFIG: dict[str, dict] = {
    "1h":  {"delta": timedelta(hours=1),  "trunc": "5min", "count": 12},
    "24h": {"delta": timedelta(hours=24), "trunc": "1h",   "count": 24},
    "7d":  {"delta": timedelta(days=7),   "trunc": "6h",   "count": 28},
    "30d": {"delta": timedelta(days=30),  "trunc": "1d",   "count": 30},
}

_STEP: dict[str, timedelta] = {
    "5min": timedelta(minutes=5),
    "1h":   timedelta(hours=1),
    "6h":   timedelta(hours=6),
    "1d":   timedelta(days=1),
}

_GRANULARITY_MAP: dict[str, str] = {
    "5m": "5min",
    "1h": "1h",
    "6h": "6h",
    "1d": "1d",
}


def _auto_granularity(delta: timedelta) -> str:
    hours = delta.total_seconds() / 3600
    if hours <= 6:
        return "5min"
    elif hours <= 72:
        return "1h"
    elif hours <= 336:
        return "6h"
    else:
        return "1d"


def _truncate_dt(dt: datetime, trunc: str) -> datetime:
    if trunc == "5min":
        return dt.replace(second=0, microsecond=0, minute=(dt.minute // 5) * 5)
    elif trunc == "1h":
        return dt.replace(second=0, microsecond=0, minute=0)
    elif trunc == "6h":
        return dt.replace(second=0, microsecond=0, minute=0, hour=(dt.hour // 6) * 6)
    else:  # 1d
        return dt.replace(second=0, microsecond=0, minute=0, hour=0)


def _bucket_expr(trunc: str):
    col = ChainCallLog.called_at
    lc = literal_column
    if trunc == "5min":
        return (
            func.date_trunc("hour", col)
            + func.floor(func.extract("minute", col) / 5) * lc("interval '5 minutes'")
        )
    elif trunc == "1h":
        return func.date_trunc("hour", col)
    elif trunc == "6h":
        return (
            func.date_trunc("day", col)
            + func.floor(func.extract("hour", col) / 6) * lc("interval '6 hours'")
        )
    else:  # 1d
        return func.date_trunc("day", col)


def _pct_change(curr: float | None, prev: float | None) -> float | None:
    if curr is None or prev is None or prev == 0:
        return None
    return round((curr - prev) / prev * 100, 1)


async def get_chain_timeseries(
    db: AsyncSession,
    chain_id: uuid.UUID,
    range_: str = "24h",
    started_after: datetime | None = None,
    started_before: datetime | None = None,
    granularity: str | None = None,
) -> dict:
    now = datetime.now(timezone.utc)

    if started_after is not None and started_before is not None:
        delta = started_before - started_after
        trunc = _GRANULARITY_MAP[granularity] if granularity else _auto_granularity(delta)
        step = _STEP[trunc]
        start_ts = _truncate_dt(started_after, trunc)
        end_ts = started_before
        count = max(1, -(-int((end_ts - start_ts).total_seconds()) // int(step.total_seconds())))
        prev_start = start_ts - delta
    else:
        cfg = _RANGE_CONFIG[range_]
        trunc = cfg["trunc"]
        step = _STEP[trunc]
        start_ts = _truncate_dt(now - cfg["delta"], trunc)
        end_ts = start_ts + step * cfg["count"]
        count = cfg["count"]
        prev_start = start_ts - cfg["delta"]

    bucket_col = _bucket_expr(trunc)

    # Timeseries query for current period
    ts_rows = (
        await db.execute(
            select(
                bucket_col.label("ts"),
                func.count().label("call_count"),
                func.avg(ChainCallLog.latency_ms).label("avg_latency_ms"),
                func.percentile_cont(0.95)
                .within_group(ChainCallLog.latency_ms.asc())
                .label("p95_latency_ms"),
            )
            .join(
                Chain,
                (ChainCallLog.chain_name == Chain.name)
                & (ChainCallLog.agent_id == Chain.agent_id),
            )
            .where(Chain.id == chain_id)
            .where(ChainCallLog.called_at >= start_ts)
            .where(ChainCallLog.called_at < end_ts)
            .group_by(bucket_col)
            .order_by(bucket_col)
        )
    ).all()

    # Build lookup: truncated ts → stats
    bucket_map: dict[datetime, dict] = {}
    for row in ts_rows:
        ts = row.ts
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        bucket_map[_truncate_dt(ts, trunc)] = {
            "call_count": row.call_count,
            "avg_latency_ms": float(row.avg_latency_ms) if row.avg_latency_ms is not None else None,
            "p95_latency_ms": float(row.p95_latency_ms) if row.p95_latency_ms is not None else None,
        }

    # Fill all expected buckets (empty → zeros/None)
    buckets = []
    for i in range(count):
        ts = start_ts + step * i
        data = bucket_map.get(ts, {"call_count": 0, "avg_latency_ms": None, "p95_latency_ms": None})
        buckets.append({"ts": ts, **data})

    # Derive current-period aggregates from ts_rows (no extra DB query)
    curr_calls = sum(r.call_count for r in ts_rows)
    latency_values = [r.avg_latency_ms for r in ts_rows if r.avg_latency_ms is not None]
    counts_with_latency = [r.call_count for r in ts_rows if r.avg_latency_ms is not None]
    if latency_values:
        curr_avg: float | None = sum(
            float(lat) * cnt for lat, cnt in zip(latency_values, counts_with_latency)
        ) / sum(counts_with_latency)
    else:
        curr_avg = None

    # Previous-period aggregate (calls + avg only; p95 trend omitted — per-bucket p95 aggregation is inaccurate)
    prev = (
        await db.execute(
            select(
                func.count().label("call_count"),
                func.avg(ChainCallLog.latency_ms).label("avg_latency_ms"),
            )
            .join(
                Chain,
                (ChainCallLog.chain_name == Chain.name)
                & (ChainCallLog.agent_id == Chain.agent_id),
            )
            .where(Chain.id == chain_id)
            .where(ChainCallLog.called_at >= prev_start)
            .where(ChainCallLog.called_at < start_ts)
        )
    ).one()

    prev_calls = prev.call_count
    prev_avg = float(prev.avg_latency_ms) if prev.avg_latency_ms is not None else None

    trend = {
        "calls_pct": _pct_change(float(curr_calls), float(prev_calls)) if prev_calls > 0 else None,
        "avg_latency_pct": _pct_change(curr_avg, prev_avg),
        "p95_latency_pct": None,
    }

    return {"buckets": buckets, "trend": trend}


async def get_chains_latency_summary(
    db: AsyncSession, agent_id: uuid.UUID
) -> list[dict]:
    rows = (
        await db.execute(
            select(
                ChainCallLog.chain_name,
                func.count().label("call_count"),
                func.avg(ChainCallLog.latency_ms).label("avg_latency_ms"),
                func.percentile_cont(0.5)
                .within_group(ChainCallLog.latency_ms.asc())
                .label("median_latency_ms"),
                func.percentile_cont(0.95)
                .within_group(ChainCallLog.latency_ms.asc())
                .label("p95_latency_ms"),
            )
            .where(ChainCallLog.agent_id == agent_id)
            .where(ChainCallLog.latency_ms.is_not(None))
            .group_by(ChainCallLog.chain_name)
            .order_by(ChainCallLog.chain_name)
        )
    ).all()

    return [
        {
            "chain_name": row.chain_name,
            "call_count": row.call_count,
            "avg_latency_ms": float(row.avg_latency_ms) if row.avg_latency_ms is not None else None,
            "p95_latency_ms": float(row.p95_latency_ms) if row.p95_latency_ms is not None else None,
            "median_latency_ms": float(row.median_latency_ms) if row.median_latency_ms is not None else None,
        }
        for row in rows
    ]


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
