import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChainCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    description: str | None = None
    persona: str | None = None
    content: str = Field(min_length=1)
    message: str = Field(default="Initial version", max_length=500)


class ChainUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    description: str | None = None
    persona: str | None = None
    content: str | None = None
    message: str | None = Field(default=None, max_length=500)
    show_in_flow: bool | None = None


class ChainStatsResponse(BaseModel):
    total_calls: int
    runs_appeared_in: int
    avg_latency_ms: float | None
    p95_latency_ms: float | None
    last_called_at: datetime | None


class ChainCallLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: uuid.UUID
    call_order: int
    latency_ms: int | None
    called_at: datetime
    input: str | None
    output: str | None


class ChainLogListResponse(BaseModel):
    items: list[ChainCallLogResponse]
    total: int


class TimeseriesBucket(BaseModel):
    ts: datetime
    call_count: int
    avg_latency_ms: float | None
    p95_latency_ms: float | None


class TimeseriesTrend(BaseModel):
    calls_pct: float | None
    avg_latency_pct: float | None
    p95_latency_pct: float | None


class ChainTimeseriesResponse(BaseModel):
    buckets: list[TimeseriesBucket]
    trend: TimeseriesTrend


class ChainLatencyItem(BaseModel):
    chain_name: str
    call_count: int
    avg_latency_ms: float | None
    p95_latency_ms: float | None
    median_latency_ms: float | None


class ChainLatencySummaryResponse(BaseModel):
    chains: list[ChainLatencyItem]


class ChainReorderRequest(BaseModel):
    chain_ids: list[uuid.UUID] = Field(min_length=1)


class ChainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    name: str
    description: str | None
    persona: str | None
    content: str
    position: int
    show_in_flow: bool
    created_at: datetime
    updated_at: datetime
