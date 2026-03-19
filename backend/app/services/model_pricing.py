import logging
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_run import AgentRun, ChainCallLog
from app.models.model_pricing import ModelPricing
from app.schemas.model_pricing import (
    ActiveModelResponse,
    CostByAgentItem,
    CostByAgentResponse,
    CostByChainItem,
    CostByChainResponse,
    CostSummaryResponse,
    CostTimeseriesBucket,
    CostTimeseriesResponse,
)

logger = logging.getLogger(__name__)

LITELLM_PRICING_URL = (
    "https://raw.githubusercontent.com/BerriAI/litellm/main/"
    "model_prices_and_context_window.json"
)


def _extract_provider(model_name: str) -> str:
    """Derive a provider name from the model name prefix."""
    if "/" in model_name:
        return model_name.split("/")[0]
    # Best-effort heuristics for un-prefixed well-known models
    if model_name.startswith("gpt-") or model_name.startswith("o1") or model_name.startswith("o3"):
        return "openai"
    if model_name.startswith("claude-"):
        return "anthropic"
    if model_name.startswith("gemini"):
        return "google"
    if model_name.startswith("mistral") or model_name.startswith("mixtral"):
        return "mistral"
    if model_name.startswith("command"):
        return "cohere"
    return "unknown"


async def sync_model_pricing(db: AsyncSession) -> int:
    """Fetch LiteLLM pricing JSON and upsert chat-mode models into model_pricing."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(LITELLM_PRICING_URL)
        resp.raise_for_status()
        data: dict = resp.json()

    rows: list[dict] = []
    for model_name, info in data.items():
        # Skip the sample_spec entry and non-chat modes
        if model_name == "sample_spec":
            continue
        if info.get("mode") != "chat":
            continue

        input_cost = info.get("input_cost_per_token")
        output_cost = info.get("output_cost_per_token")

        # Skip entries with no cost data at all
        if input_cost is None and output_cost is None:
            continue

        rows.append(
            {
                "model_name": model_name,
                "provider": info.get("litellm_provider") or _extract_provider(model_name),
                "input_cost_per_token": input_cost,
                "output_cost_per_token": output_cost,
                "max_input_tokens": info.get("max_input_tokens"),
                "max_output_tokens": info.get("max_output_tokens"),
                "supports_vision": bool(info.get("supports_vision", False)),
                "supports_function_calling": bool(
                    info.get("supports_function_calling", False)
                ),
                "source_updated_at": None,
            }
        )

    if not rows:
        return 0

    stmt = insert(ModelPricing).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["model_name"],
        set_={
            "provider": stmt.excluded.provider,
            "input_cost_per_token": stmt.excluded.input_cost_per_token,
            "output_cost_per_token": stmt.excluded.output_cost_per_token,
            "max_input_tokens": stmt.excluded.max_input_tokens,
            "max_output_tokens": stmt.excluded.max_output_tokens,
            "supports_vision": stmt.excluded.supports_vision,
            "supports_function_calling": stmt.excluded.supports_function_calling,
            "source_updated_at": stmt.excluded.source_updated_at,
            "updated_at": func.now(),
        },
    )
    await db.execute(stmt)
    await db.commit()

    logger.info("Upserted %d chat model pricing rows", len(rows))
    return len(rows)


async def list_model_pricing(
    db: AsyncSession,
    provider: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    active_names: set[str] | None = None,
) -> tuple[list[ModelPricing], int]:
    """Return a paginated list of ModelPricing rows with optional filters.

    When *active_names* is provided, matching rows are sorted to the top.
    """
    base_query = select(ModelPricing)

    if provider:
        base_query = base_query.where(ModelPricing.provider == provider)
    if search:
        base_query = base_query.where(
            ModelPricing.model_name.ilike(f"%{search}%")
        )

    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total: int = count_result.scalar_one()

    # Active models first, then alphabetical
    from sqlalchemy import case
    order_clauses = []
    if active_names:
        order_clauses.append(
            case((ModelPricing.model_name.in_(active_names), 0), else_=1)
        )
    order_clauses.append(ModelPricing.model_name)

    result = await db.execute(
        base_query.order_by(*order_clauses).limit(limit).offset(offset)
    )
    items = list(result.scalars().all())
    return items, total


async def get_model_pricing(
    db: AsyncSession, model_name: str
) -> ModelPricing | None:
    """Fetch a single ModelPricing row by model_name."""
    result = await db.execute(
        select(ModelPricing).where(ModelPricing.model_name == model_name)
    )
    return result.scalar_one_or_none()


def _build_active_models_stmt(user_id: uuid.UUID, since: datetime | None = None):
    """Build the base select statement for active model aggregation."""
    stmt = (
        select(
            ChainCallLog.model_name,
            func.count().label("call_count"),
            func.max(ChainCallLog.called_at).label("last_used_at"),
            ModelPricing.provider,
            ModelPricing.input_cost_per_token,
            ModelPricing.output_cost_per_token,
            ModelPricing.max_input_tokens,
            ModelPricing.max_output_tokens,
            func.coalesce(func.sum(ChainCallLog.prompt_tokens), 0).label("total_prompt_tokens"),
            func.coalesce(func.sum(ChainCallLog.completion_tokens), 0).label("total_completion_tokens"),
            func.coalesce(func.sum(ChainCallLog.total_tokens), 0).label("total_tokens"),
        )
        .join(AgentRun, ChainCallLog.run_id == AgentRun.id)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .outerjoin(ModelPricing, ChainCallLog.model_name == ModelPricing.model_name)
        .where(ChainCallLog.model_name.is_not(None))
        .where(Agent.owner_id == user_id)
    )
    if since is not None:
        stmt = stmt.where(ChainCallLog.called_at >= since)
    stmt = stmt.group_by(
        ChainCallLog.model_name,
        ModelPricing.provider,
        ModelPricing.input_cost_per_token,
        ModelPricing.output_cost_per_token,
        ModelPricing.max_input_tokens,
        ModelPricing.max_output_tokens,
    ).order_by(func.count().desc())
    return stmt


def _row_to_active_model_response(row) -> ActiveModelResponse:
    input_cost = row.input_cost_per_token
    output_cost = row.output_cost_per_token
    if input_cost is not None and output_cost is not None:
        total_cost = (
            row.total_prompt_tokens * input_cost
            + row.total_completion_tokens * output_cost
        )
    else:
        total_cost = None
    return ActiveModelResponse(
        model_name=row.model_name,
        provider=row.provider,
        call_count=row.call_count,
        last_used_at=row.last_used_at,
        input_cost_per_token=input_cost,
        output_cost_per_token=output_cost,
        max_input_tokens=row.max_input_tokens,
        max_output_tokens=row.max_output_tokens,
        total_prompt_tokens=row.total_prompt_tokens,
        total_completion_tokens=row.total_completion_tokens,
        total_tokens=row.total_tokens,
        total_cost=total_cost,
    )


async def get_active_models(
    db: AsyncSession, user_id: uuid.UUID
) -> list[ActiveModelResponse]:
    """Return models that appear in chain_call_logs for the given user's agents,
    joined with pricing data and usage stats."""
    stmt = _build_active_models_stmt(user_id)
    result = await db.execute(stmt)
    rows = result.all()
    return [_row_to_active_model_response(row) for row in rows]


async def get_cost_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    hours: int | None = None,
) -> CostSummaryResponse:
    """Return aggregated cost and token usage, optionally filtered to the last N hours."""
    since: datetime | None = None
    if hours is not None:
        since = datetime.now(tz=timezone.utc) - timedelta(hours=hours)

    stmt = _build_active_models_stmt(user_id, since=since)
    result = await db.execute(stmt)
    rows = result.all()

    by_model = [_row_to_active_model_response(row) for row in rows]

    total_prompt_tokens = sum(m.total_prompt_tokens for m in by_model)
    total_completion_tokens = sum(m.total_completion_tokens for m in by_model)
    total_tokens = sum(m.total_tokens for m in by_model)

    costs = [m.total_cost for m in by_model if m.total_cost is not None]
    total_cost: float | None = sum(costs) if costs else None

    period_start: datetime | None = since
    period_end: datetime | None = datetime.now(tz=timezone.utc) if since is not None else None

    return CostSummaryResponse(
        total_cost=total_cost,
        total_prompt_tokens=total_prompt_tokens,
        total_completion_tokens=total_completion_tokens,
        total_tokens=total_tokens,
        by_model=by_model,
        period_start=period_start,
        period_end=period_end,
    )


async def get_cost_by_agent(
    db: AsyncSession,
    user_id: uuid.UUID,
    hours: int | None = None,
    limit: int = 20,
) -> CostByAgentResponse:
    """Return cost and token usage aggregated per agent for the given user."""
    since: datetime | None = None
    if hours is not None:
        since = datetime.now(tz=timezone.utc) - timedelta(hours=hours)

    # Compute cost per chain_call_log row, then aggregate by agent.
    # cost_expr is None-safe: when mp columns are NULL the multiplication
    # produces NULL, which SUM ignores — so total_cost stays NULL for
    # agents with no pricing data.
    cost_per_row = (
        ChainCallLog.prompt_tokens * ModelPricing.input_cost_per_token
        + ChainCallLog.completion_tokens * ModelPricing.output_cost_per_token
    )

    stmt = (
        select(
            Agent.id.label("agent_id"),
            Agent.name.label("agent_name"),
            func.count(AgentRun.id.distinct()).label("run_count"),
            func.coalesce(func.sum(ChainCallLog.prompt_tokens), 0).label("total_prompt_tokens"),
            func.coalesce(func.sum(ChainCallLog.completion_tokens), 0).label("total_completion_tokens"),
            func.coalesce(func.sum(ChainCallLog.total_tokens), 0).label("total_tokens"),
            func.sum(cost_per_row).label("total_cost"),
        )
        .join(AgentRun, ChainCallLog.run_id == AgentRun.id)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .outerjoin(ModelPricing, ChainCallLog.model_name == ModelPricing.model_name)
        .where(ChainCallLog.model_name.is_not(None))
        .where(Agent.owner_id == user_id)
    )
    if since is not None:
        stmt = stmt.where(ChainCallLog.called_at >= since)

    stmt = (
        stmt
        .group_by(Agent.id, Agent.name)
        .order_by(func.sum(cost_per_row).desc().nulls_last())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    items: list[CostByAgentItem] = []
    for row in rows:
        total_cost = float(row.total_cost) if row.total_cost is not None else None
        run_count = row.run_count or 0
        avg_cost_per_run: float | None = None
        if total_cost is not None and run_count > 0:
            avg_cost_per_run = total_cost / run_count
        items.append(
            CostByAgentItem(
                agent_id=row.agent_id,
                agent_name=row.agent_name,
                run_count=run_count,
                total_prompt_tokens=row.total_prompt_tokens,
                total_completion_tokens=row.total_completion_tokens,
                total_tokens=row.total_tokens,
                total_cost=total_cost,
                avg_cost_per_run=avg_cost_per_run,
            )
        )

    costs = [i.total_cost for i in items if i.total_cost is not None]
    overall_total_cost: float | None = sum(costs) if costs else None
    total_runs = sum(i.run_count for i in items)
    total_tokens = sum(i.total_tokens for i in items)

    return CostByAgentResponse(
        items=items,
        total_cost=overall_total_cost,
        total_runs=total_runs,
        total_tokens=total_tokens,
    )


async def get_cost_by_chain(
    db: AsyncSession,
    user_id: uuid.UUID,
    hours: int | None = None,
    limit: int = 50,
    agent_id: uuid.UUID | None = None,
) -> CostByChainResponse:
    """Return cost and token usage aggregated per (agent, chain) for the given user."""
    since: datetime | None = None
    if hours is not None:
        since = datetime.now(tz=timezone.utc) - timedelta(hours=hours)

    cost_per_row = (
        ChainCallLog.prompt_tokens * ModelPricing.input_cost_per_token
        + ChainCallLog.completion_tokens * ModelPricing.output_cost_per_token
    )

    stmt = (
        select(
            Agent.id.label("agent_id"),
            Agent.name.label("agent_name"),
            ChainCallLog.chain_name,
            func.count().label("call_count"),
            func.coalesce(func.sum(ChainCallLog.prompt_tokens), 0).label("total_prompt_tokens"),
            func.coalesce(func.sum(ChainCallLog.completion_tokens), 0).label("total_completion_tokens"),
            func.coalesce(func.sum(ChainCallLog.total_tokens), 0).label("total_tokens"),
            func.sum(cost_per_row).label("total_cost"),
        )
        .join(AgentRun, ChainCallLog.run_id == AgentRun.id)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .outerjoin(ModelPricing, ChainCallLog.model_name == ModelPricing.model_name)
        .where(ChainCallLog.model_name.is_not(None))
        .where(Agent.owner_id == user_id)
    )
    if agent_id is not None:
        stmt = stmt.where(Agent.id == agent_id)
    if since is not None:
        stmt = stmt.where(ChainCallLog.called_at >= since)

    stmt = (
        stmt
        .group_by(Agent.id, Agent.name, ChainCallLog.chain_name)
        .order_by(func.sum(cost_per_row).desc().nulls_last())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    items: list[CostByChainItem] = []
    for row in rows:
        total_cost = float(row.total_cost) if row.total_cost is not None else None
        items.append(
            CostByChainItem(
                agent_id=row.agent_id,
                agent_name=row.agent_name,
                chain_name=row.chain_name,
                call_count=row.call_count,
                total_prompt_tokens=row.total_prompt_tokens,
                total_completion_tokens=row.total_completion_tokens,
                total_tokens=row.total_tokens,
                total_cost=total_cost,
            )
        )

    costs = [i.total_cost for i in items if i.total_cost is not None]
    overall_total_cost: float | None = sum(costs) if costs else None

    return CostByChainResponse(items=items, total_cost=overall_total_cost)


async def get_cost_timeseries(
    db: AsyncSession,
    user_id: uuid.UUID,
    hours: int | None = None,
    group_by: str = "agent",
    agent_id: uuid.UUID | None = None,
) -> CostTimeseriesResponse:
    """Return time-bucketed cost and token usage grouped by agent or model.

    Granularity: 'hour' when hours <= 24, 'day' otherwise (or when hours is None).
    For group_by='agent', only the top 5 agents by total cost are shown
    individually; all remaining data is collapsed into an 'Others' bucket.
    """
    since: datetime | None = None
    if hours is not None:
        since = datetime.now(tz=timezone.utc) - timedelta(hours=hours)

    trunc_unit = "hour" if (hours is not None and hours <= 24) else "day"

    cost_per_row = (
        ChainCallLog.prompt_tokens * ModelPricing.input_cost_per_token
        + ChainCallLog.completion_tokens * ModelPricing.output_cost_per_token
    )

    bucket_col = func.date_trunc(trunc_unit, ChainCallLog.called_at)

    if group_by == "model":
        group_label = ChainCallLog.model_name
    else:
        group_label = Agent.name

    stmt = (
        select(
            bucket_col.label("bucket"),
            group_label.label("group"),
            func.sum(cost_per_row).label("cost"),
            func.coalesce(func.sum(ChainCallLog.total_tokens), 0).label("tokens"),
        )
        .join(AgentRun, ChainCallLog.run_id == AgentRun.id)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .outerjoin(ModelPricing, ChainCallLog.model_name == ModelPricing.model_name)
        .where(ChainCallLog.model_name.is_not(None))
        .where(Agent.owner_id == user_id)
    )
    if agent_id is not None:
        stmt = stmt.where(Agent.id == agent_id)
    if since is not None:
        stmt = stmt.where(ChainCallLog.called_at >= since)

    from sqlalchemy import literal_column
    stmt = (
        stmt
        .group_by(literal_column("1"), literal_column("2"))
        .order_by(literal_column("1"))
    )

    result = await db.execute(stmt)
    rows = result.all()

    if group_by == "agent":
        # Identify top 5 agents by total cost across the whole period.
        agent_totals: dict[str, float] = {}
        for row in rows:
            group = row.group or "unknown"
            cost = float(row.cost) if row.cost is not None else 0.0
            agent_totals[group] = agent_totals.get(group, 0.0) + cost

        top5 = set(
            sorted(agent_totals, key=lambda k: agent_totals[k], reverse=True)[:5]
        )

        # Aggregate rows: top-5 agents keep their name, the rest become "Others".
        # Use (bucket, group) as the merge key.
        merged: dict[tuple, dict] = {}
        for row in rows:
            group = row.group or "unknown"
            effective_group = group if group in top5 else "Others"
            bucket_key = (row.bucket, effective_group)
            if bucket_key not in merged:
                merged[bucket_key] = {"cost": 0.0, "tokens": 0}
            merged[bucket_key]["cost"] += float(row.cost) if row.cost is not None else 0.0
            merged[bucket_key]["tokens"] += int(row.tokens)

        buckets = [
            CostTimeseriesBucket(
                bucket=bucket_dt.date().isoformat() if trunc_unit == "day" else bucket_dt.isoformat(),
                group=group,
                cost=vals["cost"],
                tokens=vals["tokens"],
            )
            for (bucket_dt, group), vals in sorted(merged.items(), key=lambda kv: kv[0][0])
        ]
    else:
        buckets = [
            CostTimeseriesBucket(
                bucket=row.bucket.date().isoformat() if trunc_unit == "day" else row.bucket.isoformat(),
                group=row.group or "unknown",
                cost=float(row.cost) if row.cost is not None else 0.0,
                tokens=int(row.tokens),
            )
            for row in rows
        ]

    return CostTimeseriesResponse(buckets=buckets, period_hours=hours)
