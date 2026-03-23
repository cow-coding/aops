import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MonitoringKPITrend(BaseModel):
    total_runs_pct: float | None
    error_rate_pct: float | None
    avg_latency_pct: float | None
    p95_latency_pct: float | None


class MonitoringKPI(BaseModel):
    total_runs: int
    error_rate: float
    avg_latency_ms: float | None
    p95_latency_ms: float | None
    trend: MonitoringKPITrend


class AgentHealthRow(BaseModel):
    agent_id: uuid.UUID
    agent_name: str
    runs: int
    error_rate: float
    avg_latency_ms: float | None
    p95_latency_ms: float | None
    null_rate: float
    status: Literal["healthy", "warning", "critical", "dormant"]
    last_run_at: datetime | None


class SlowChainRow(BaseModel):
    agent_id: uuid.UUID
    agent_name: str
    chain_id: uuid.UUID | None
    chain_name: str
    p95_latency_ms: float
    calls: int


class MonitoringSummaryResponse(BaseModel):
    kpi: MonitoringKPI
    agent_health: list[AgentHealthRow]
    slow_chains: list[SlowChainRow]
    range_hours: int
