import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ModelPricingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    model_name: str
    provider: str
    input_cost_per_token: float | None
    output_cost_per_token: float | None
    max_input_tokens: int | None
    max_output_tokens: int | None
    supports_vision: bool
    supports_function_calling: bool
    updated_at: datetime | None


class ModelPricingListResponse(BaseModel):
    items: list[ModelPricingResponse]
    total: int


class SyncResultResponse(BaseModel):
    synced: int
    message: str


class ActiveModelResponse(BaseModel):
    model_name: str
    provider: str | None
    call_count: int
    last_used_at: datetime | None
    input_cost_per_token: float | None
    output_cost_per_token: float | None
    max_input_tokens: int | None
    max_output_tokens: int | None
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost: float | None  # None if no pricing data


class CostSummaryResponse(BaseModel):
    total_cost: float | None
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    by_model: list[ActiveModelResponse]
    period_start: datetime | None
    period_end: datetime | None


class CostByAgentItem(BaseModel):
    agent_id: uuid.UUID
    agent_name: str
    run_count: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost: float | None
    avg_cost_per_run: float | None


class CostByAgentResponse(BaseModel):
    items: list[CostByAgentItem]
    total_cost: float | None
    total_runs: int
    total_tokens: int


class CostByChainItem(BaseModel):
    agent_id: uuid.UUID
    agent_name: str
    chain_name: str
    call_count: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost: float | None


class CostByChainResponse(BaseModel):
    items: list[CostByChainItem]
    total_cost: float | None


class CostTimeseriesBucket(BaseModel):
    bucket: str  # ISO date string e.g. "2026-03-19"
    group: str   # agent_name or model_name depending on group_by
    cost: float
    tokens: int


class CostTimeseriesResponse(BaseModel):
    buckets: list[CostTimeseriesBucket]
    period_hours: int | None
