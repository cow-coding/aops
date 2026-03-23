import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_run import AgentRun, ChainCallLog
from app.models.chain import Chain
from app.services import agent as agent_service


def _latency_ms_expr():
    """Run-level latency: (ended_at - started_at) in milliseconds."""
    return func.extract("epoch", AgentRun.ended_at - AgentRun.started_at) * 1000


def _pct_change(curr: float | None, prev: float | None) -> float | None:
    if curr is None or prev is None or prev == 0:
        return None
    return round((curr - prev) / prev * 100, 1)


def _agent_status(
    error_rate: float,
    latency_spike: bool,
    total_runs: int,
    last_run_at: datetime | None,
    range_hours: int,
) -> Literal["healthy", "warning", "critical", "dormant"]:
    # Priority: critical > warning > dormant > healthy
    if error_rate > 0.2:
        return "critical"
    if error_rate > 0.05 or latency_spike:
        return "warning"
    # Dormant: disabled for 1h queries (false positive prevention)
    if range_hours > 1 and total_runs == 0:
        threshold = datetime.now(timezone.utc) - timedelta(hours=range_hours * 2)
        # Normalize last_run_at to timezone-aware for comparison
        if last_run_at is None:
            return "dormant"
        aware_last = (
            last_run_at.replace(tzinfo=timezone.utc)
            if last_run_at.tzinfo is None
            else last_run_at
        )
        if aware_last < threshold:
            return "dormant"
    return "healthy"


async def get_monitoring_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    hours: int = 24,
) -> dict:
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(hours=hours)
    period_end = now
    prev_start = period_start - timedelta(hours=hours)

    agents = await agent_service.get_agents(db, user_id=user_id)
    if not agents:
        return {
            "kpi": {
                "total_runs": 0,
                "error_rate": 0.0,
                "avg_latency_ms": None,
                "p95_latency_ms": None,
                "trend": {
                    "total_runs_pct": None,
                    "error_rate_pct": None,
                    "avg_latency_pct": None,
                    "p95_latency_pct": None,
                },
            },
            "agent_health": [],
            "slow_chains": [],
            "range_hours": hours,
        }

    agent_ids = [a.id for a in agents]
    agent_name_map = {a.id: a.name for a in agents}
    latency_ms = _latency_ms_expr()

    # --- Overall KPI: current + previous period in single query via CASE WHEN ---
    is_curr = (AgentRun.started_at >= period_start) & (AgentRun.started_at < period_end)
    is_prev = (AgentRun.started_at >= prev_start) & (AgentRun.started_at < period_start)

    overall_row = (
        await db.execute(
            select(
                func.count().filter(is_curr).label("curr_total_runs"),
                func.count().filter(is_curr & (AgentRun.status == "error")).label(
                    "curr_total_errors"
                ),
                func.avg(latency_ms).filter(is_curr).label("curr_avg_latency_ms"),
                func.percentile_cont(0.95)
                .within_group(latency_ms.asc())
                .filter(is_curr)
                .label("curr_p95_latency_ms"),
                func.count().filter(is_prev).label("prev_total_runs"),
                func.count().filter(is_prev & (AgentRun.status == "error")).label(
                    "prev_total_errors"
                ),
                func.avg(latency_ms).filter(is_prev).label("prev_avg_latency_ms"),
                func.percentile_cont(0.95)
                .within_group(latency_ms.asc())
                .filter(is_prev)
                .label("prev_p95_latency_ms"),
            ).where(
                AgentRun.agent_id.in_(agent_ids),
                AgentRun.started_at >= prev_start,
                AgentRun.started_at < period_end,
            )
        )
    ).one()

    curr_total_runs = overall_row.curr_total_runs
    curr_total_errors = overall_row.curr_total_errors
    curr_avg = (
        float(overall_row.curr_avg_latency_ms)
        if overall_row.curr_avg_latency_ms is not None
        else None
    )
    curr_p95 = (
        float(overall_row.curr_p95_latency_ms)
        if overall_row.curr_p95_latency_ms is not None
        else None
    )
    prev_total_runs = overall_row.prev_total_runs
    prev_total_errors = overall_row.prev_total_errors
    prev_avg = (
        float(overall_row.prev_avg_latency_ms)
        if overall_row.prev_avg_latency_ms is not None
        else None
    )
    prev_p95 = (
        float(overall_row.prev_p95_latency_ms)
        if overall_row.prev_p95_latency_ms is not None
        else None
    )

    curr_error_rate = curr_total_errors / curr_total_runs if curr_total_runs > 0 else 0.0
    prev_error_rate = prev_total_errors / prev_total_runs if prev_total_runs > 0 else None

    kpi = {
        "total_runs": curr_total_runs,
        "error_rate": round(curr_error_rate, 4),
        "avg_latency_ms": curr_avg,
        "p95_latency_ms": curr_p95,
        "trend": {
            "total_runs_pct": _pct_change(float(curr_total_runs), float(prev_total_runs)),
            "error_rate_pct": _pct_change(curr_error_rate, prev_error_rate),
            "avg_latency_pct": _pct_change(curr_avg, prev_avg),
            "p95_latency_pct": _pct_change(curr_p95, prev_p95),
        },
    }

    # --- Per-agent CTEs ---

    # Driving table: all accessible agents (ensures runs=0 agents are included)
    agent_list_cte = (
        select(Agent.id.label("agent_id"))
        .where(Agent.id.in_(agent_ids))
        .cte("agent_list")
    )

    # Current period stats
    run_stats_cte = (
        select(
            AgentRun.agent_id,
            func.count().label("total_runs"),
            func.count().filter(AgentRun.status == "error").label("error_count"),
            func.avg(latency_ms).label("avg_latency_ms"),
            func.percentile_cont(0.95)
            .within_group(latency_ms.asc())
            .label("p95_latency_ms"),
        )
        .where(
            AgentRun.agent_id.in_(agent_ids),
            AgentRun.started_at >= period_start,
            AgentRun.started_at < period_end,
        )
        .group_by(AgentRun.agent_id)
        .cte("run_stats")
    )

    # Previous period avg latency (for latency trend / spike detection)
    prev_stats_cte = (
        select(
            AgentRun.agent_id,
            func.avg(latency_ms).label("prev_avg_latency_ms"),
        )
        .where(
            AgentRun.agent_id.in_(agent_ids),
            AgentRun.started_at >= prev_start,
            AgentRun.started_at < period_start,
        )
        .group_by(AgentRun.agent_id)
        .cte("prev_stats")
    )

    # Null output rate (current period)
    chain_null_cte = (
        select(
            ChainCallLog.agent_id,
            (
                func.count().filter(ChainCallLog.output.is_(None)) * 1.0
                / func.nullif(func.count(), 0)
            ).label("null_output_rate"),
        )
        .where(
            ChainCallLog.agent_id.in_(agent_ids),
            ChainCallLog.called_at >= period_start,
            ChainCallLog.called_at < period_end,
        )
        .group_by(ChainCallLog.agent_id)
        .cte("chain_null_stats")
    )

    # All-time last run per agent (for dormant detection)
    last_run_cte = (
        select(
            AgentRun.agent_id,
            func.max(AgentRun.started_at).label("last_run_at"),
        )
        .where(AgentRun.agent_id.in_(agent_ids))
        .group_by(AgentRun.agent_id)
        .cte("last_run")
    )

    # Main query: drive from agent_list, LEFT JOIN all CTEs
    agent_rows = (
        await db.execute(
            select(
                agent_list_cte.c.agent_id,
                func.coalesce(run_stats_cte.c.total_runs, 0).label("total_runs"),
                func.coalesce(run_stats_cte.c.error_count, 0).label("error_count"),
                run_stats_cte.c.avg_latency_ms,
                run_stats_cte.c.p95_latency_ms,
                prev_stats_cte.c.prev_avg_latency_ms,
                chain_null_cte.c.null_output_rate,
                last_run_cte.c.last_run_at,
            )
            .outerjoin(
                run_stats_cte,
                agent_list_cte.c.agent_id == run_stats_cte.c.agent_id,
            )
            .outerjoin(
                prev_stats_cte,
                agent_list_cte.c.agent_id == prev_stats_cte.c.agent_id,
            )
            .outerjoin(
                chain_null_cte,
                agent_list_cte.c.agent_id == chain_null_cte.c.agent_id,
            )
            .outerjoin(
                last_run_cte,
                agent_list_cte.c.agent_id == last_run_cte.c.agent_id,
            )
        )
    ).all()

    agent_health = []
    for row in agent_rows:
        total = row.total_runs  # coalesced to 0
        error_count = row.error_count  # coalesced to 0
        agent_error_rate = round(error_count / total, 4) if total > 0 else 0.0

        curr_agent_avg = (
            float(row.avg_latency_ms) if row.avg_latency_ms is not None else None
        )
        prev_agent_avg = (
            float(row.prev_avg_latency_ms) if row.prev_avg_latency_ms is not None else None
        )
        trend_pct = _pct_change(curr_agent_avg, prev_agent_avg)
        latency_spike = trend_pct is not None and trend_pct >= 100

        agent_health.append(
            {
                "agent_id": row.agent_id,
                "agent_name": agent_name_map.get(row.agent_id, "unknown"),
                "runs": total,
                "error_rate": agent_error_rate,
                "avg_latency_ms": curr_agent_avg,
                "p95_latency_ms": (
                    float(row.p95_latency_ms) if row.p95_latency_ms is not None else None
                ),
                "null_rate": (
                    round(float(row.null_output_rate), 4)
                    if row.null_output_rate is not None
                    else 0.0
                ),
                "status": _agent_status(
                    error_rate=agent_error_rate,
                    latency_spike=latency_spike,
                    total_runs=total,
                    last_run_at=row.last_run_at,
                    range_hours=hours,
                ),
                "last_run_at": row.last_run_at,
            }
        )

    # --- Slow chains: top 10 by p95 latency ---
    # LEFT JOIN chains on (agent_id, name) to resolve chain_id
    p95_expr = func.percentile_cont(0.95).within_group(ChainCallLog.latency_ms.asc())
    slow_rows = (
        await db.execute(
            select(
                ChainCallLog.agent_id,
                ChainCallLog.chain_name,
                Chain.id.label("chain_id"),
                p95_expr.label("p95_latency_ms"),
                func.count().label("calls"),
            )
            .outerjoin(
                Chain,
                (ChainCallLog.agent_id == Chain.agent_id)
                & (ChainCallLog.chain_name == Chain.name),
            )
            .where(
                ChainCallLog.agent_id.in_(agent_ids),
                ChainCallLog.called_at >= period_start,
                ChainCallLog.called_at < period_end,
                ChainCallLog.latency_ms.isnot(None),
            )
            .group_by(ChainCallLog.agent_id, ChainCallLog.chain_name, Chain.id)
            .order_by(p95_expr.desc())
            .limit(10)
        )
    ).all()

    slow_chains = [
        {
            "agent_id": row.agent_id,
            "agent_name": agent_name_map.get(row.agent_id, "unknown"),
            "chain_id": row.chain_id,
            "chain_name": row.chain_name,
            "p95_latency_ms": float(row.p95_latency_ms),
            "calls": row.calls,
        }
        for row in slow_rows
    ]

    return {
        "kpi": kpi,
        "agent_health": agent_health,
        "slow_chains": slow_chains,
        "range_hours": hours,
    }
