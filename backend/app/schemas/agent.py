import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AgentStatsTrend(BaseModel):
    total_runs_pct: float | None
    avg_latency_pct: float | None
    p95_latency_pct: float | None


class AgentStatsResponse(BaseModel):
    total_runs: int
    success_count: int
    error_count: int
    avg_latency_ms: float | None
    p95_latency_ms: float | None
    trend: AgentStatsTrend


class AgentTimeseriesBucket(BaseModel):
    ts: datetime
    run_count: int
    avg_latency_ms: float | None
    p95_latency_ms: float | None


class AgentTimeseriesResponse(BaseModel):
    buckets: list[AgentTimeseriesBucket]
    trend: AgentStatsTrend


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    description: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    description: str | None = None


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
