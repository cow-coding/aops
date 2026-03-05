import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, literal_column, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_group import AgentGroup
from app.models.agent_run import AgentRun
from app.models.user_group import UserGroup
from app.schemas.agent import AgentCreate, AgentUpdate


async def get_agents(db: AsyncSession, user_id: uuid.UUID | None = None) -> list[Agent]:
    """Return agents accessible by user_id (owned or shared via group), or all if None."""
    if user_id is None:
        result = await db.execute(select(Agent).order_by(Agent.created_at.desc()))
        return list(result.scalars().all())

    # Agents owned by user OR shared to a group the user belongs to
    shared_subq = (
        select(AgentGroup.agent_id)
        .join(UserGroup, AgentGroup.group_id == UserGroup.group_id)
        .where(UserGroup.user_id == user_id)
        .scalar_subquery()
    )
    result = await db.execute(
        select(Agent)
        .where(or_(Agent.owner_id == user_id, Agent.id.in_(shared_subq)))
        .order_by(Agent.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def get_agent(db: AsyncSession, agent_id: uuid.UUID) -> Agent | None:
    return await db.get(Agent, agent_id)


async def can_access_agent(
    db: AsyncSession, agent: Agent, user_id: uuid.UUID
) -> bool:
    """Return True if user owns the agent or belongs to a group with access."""
    if agent.owner_id == user_id:
        return True
    result = await db.execute(
        select(AgentGroup)
        .join(UserGroup, AgentGroup.group_id == UserGroup.group_id)
        .where(
            AgentGroup.agent_id == agent.id,
            UserGroup.user_id == user_id,
        )
    )
    return result.first() is not None


async def create_agent(
    db: AsyncSession, data: AgentCreate, owner_id: uuid.UUID | None = None
) -> Agent:
    agent = Agent(**data.model_dump(), owner_id=owner_id)
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


async def update_agent(
    db: AsyncSession, agent: Agent, data: AgentUpdate
) -> Agent:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    await db.commit()
    await db.refresh(agent)
    return agent


async def delete_agent(db: AsyncSession, agent: Agent) -> None:
    await db.delete(agent)
    await db.commit()


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
    col = AgentRun.started_at
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


def _latency_ms_expr():
    """Compute run latency in milliseconds from started_at/ended_at."""
    return func.extract("epoch", AgentRun.ended_at - AgentRun.started_at) * 1000


async def get_agent_stats(db: AsyncSession, agent_id: uuid.UUID) -> dict:
    latency_ms = _latency_ms_expr()

    # All-time aggregates
    result = await db.execute(
        select(
            func.count().label("total_runs"),
            func.count(AgentRun.ended_at).label("success_count"),
            func.avg(latency_ms).label("avg_latency_ms"),
            func.percentile_cont(0.95).within_group(latency_ms.asc()).label("p95_latency_ms"),
        )
        .where(AgentRun.agent_id == agent_id)
    )
    row = result.one()

    total_runs = row.total_runs
    success_count = row.success_count
    error_count = total_runs - success_count

    # Trend: last 24h vs previous 24h
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(hours=24)
    prev_start = period_start - timedelta(hours=24)

    curr_row = (
        await db.execute(
            select(
                func.count().label("total_runs"),
                func.avg(latency_ms).label("avg_latency_ms"),
                func.percentile_cont(0.95).within_group(latency_ms.asc()).label("p95_latency_ms"),
            )
            .where(AgentRun.agent_id == agent_id)
            .where(AgentRun.started_at >= period_start)
        )
    ).one()

    prev_row = (
        await db.execute(
            select(
                func.count().label("total_runs"),
                func.avg(latency_ms).label("avg_latency_ms"),
                func.percentile_cont(0.95).within_group(latency_ms.asc()).label("p95_latency_ms"),
            )
            .where(AgentRun.agent_id == agent_id)
            .where(AgentRun.started_at >= prev_start)
            .where(AgentRun.started_at < period_start)
        )
    ).one()

    curr_avg = float(curr_row.avg_latency_ms) if curr_row.avg_latency_ms is not None else None
    prev_avg = float(prev_row.avg_latency_ms) if prev_row.avg_latency_ms is not None else None
    curr_p95 = float(curr_row.p95_latency_ms) if curr_row.p95_latency_ms is not None else None
    prev_p95 = float(prev_row.p95_latency_ms) if prev_row.p95_latency_ms is not None else None

    return {
        "total_runs": total_runs,
        "success_count": success_count,
        "error_count": error_count,
        "avg_latency_ms": float(row.avg_latency_ms) if row.avg_latency_ms is not None else None,
        "p95_latency_ms": float(row.p95_latency_ms) if row.p95_latency_ms is not None else None,
        "trend": {
            "total_runs_pct": _pct_change(float(curr_row.total_runs), float(prev_row.total_runs)),
            "avg_latency_pct": _pct_change(curr_avg, prev_avg),
            "p95_latency_pct": _pct_change(curr_p95, prev_p95),
        },
    }


async def get_agent_timeseries(
    db: AsyncSession,
    agent_id: uuid.UUID,
    range_: str,
) -> dict:
    cfg = _RANGE_CONFIG[range_]
    now = datetime.now(timezone.utc)
    trunc = cfg["trunc"]
    step = _STEP[trunc]
    latency_ms = _latency_ms_expr()

    start_ts = _truncate_dt(now - cfg["delta"], trunc)
    end_ts = start_ts + step * cfg["count"]
    prev_start = start_ts - cfg["delta"]

    bucket_col = _bucket_expr(trunc)

    ts_rows = (
        await db.execute(
            select(
                bucket_col.label("ts"),
                func.count().label("run_count"),
                func.avg(latency_ms).label("avg_latency_ms"),
                func.percentile_cont(0.95).within_group(latency_ms.asc()).label("p95_latency_ms"),
            )
            .where(AgentRun.agent_id == agent_id)
            .where(AgentRun.started_at >= start_ts)
            .where(AgentRun.started_at < end_ts)
            .group_by(bucket_col)
            .order_by(bucket_col)
        )
    ).all()

    bucket_map: dict[datetime, dict] = {}
    for row in ts_rows:
        ts = row.ts
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        bucket_map[_truncate_dt(ts, trunc)] = {
            "run_count": row.run_count,
            "avg_latency_ms": float(row.avg_latency_ms) if row.avg_latency_ms is not None else None,
            "p95_latency_ms": float(row.p95_latency_ms) if row.p95_latency_ms is not None else None,
        }

    buckets = []
    for i in range(cfg["count"]):
        ts = start_ts + step * i
        data = bucket_map.get(ts, {"run_count": 0, "avg_latency_ms": None, "p95_latency_ms": None})
        buckets.append({"ts": ts, **data})

    # Current period aggregates for trend
    curr_runs = sum(r.run_count for r in ts_rows)
    latency_values = [r.avg_latency_ms for r in ts_rows if r.avg_latency_ms is not None]
    counts_with_latency = [r.run_count for r in ts_rows if r.avg_latency_ms is not None]
    if latency_values:
        curr_avg: float | None = sum(
            float(lat) * cnt for lat, cnt in zip(latency_values, counts_with_latency)
        ) / sum(counts_with_latency)
    else:
        curr_avg = None

    prev = (
        await db.execute(
            select(
                func.count().label("run_count"),
                func.avg(latency_ms).label("avg_latency_ms"),
            )
            .where(AgentRun.agent_id == agent_id)
            .where(AgentRun.started_at >= prev_start)
            .where(AgentRun.started_at < start_ts)
        )
    ).one()

    prev_runs = prev.run_count
    prev_avg = float(prev.avg_latency_ms) if prev.avg_latency_ms is not None else None

    trend = {
        "total_runs_pct": _pct_change(float(curr_runs), float(prev_runs)) if prev_runs > 0 else None,
        "avg_latency_pct": _pct_change(curr_avg, prev_avg),
        "p95_latency_pct": None,
    }

    return {"buckets": buckets, "trend": trend}

