import logging
import uuid

import httpx
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_run import AgentRun, ChainCallLog
from app.models.model_pricing import ModelPricing
from app.schemas.model_pricing import ActiveModelResponse

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


async def get_active_models(
    db: AsyncSession, user_id: uuid.UUID
) -> list[ActiveModelResponse]:
    """Return models that appear in chain_call_logs for the given user's agents,
    joined with pricing data and usage stats."""
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
        )
        .join(AgentRun, ChainCallLog.run_id == AgentRun.id)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .outerjoin(ModelPricing, ChainCallLog.model_name == ModelPricing.model_name)
        .where(ChainCallLog.model_name.is_not(None))
        .where(Agent.owner_id == user_id)
        .group_by(
            ChainCallLog.model_name,
            ModelPricing.provider,
            ModelPricing.input_cost_per_token,
            ModelPricing.output_cost_per_token,
            ModelPricing.max_input_tokens,
            ModelPricing.max_output_tokens,
        )
        .order_by(func.count().desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        ActiveModelResponse(
            model_name=row.model_name,
            provider=row.provider,
            call_count=row.call_count,
            last_used_at=row.last_used_at,
            input_cost_per_token=row.input_cost_per_token,
            output_cost_per_token=row.output_cost_per_token,
            max_input_tokens=row.max_input_tokens,
            max_output_tokens=row.max_output_tokens,
        )
        for row in rows
    ]
