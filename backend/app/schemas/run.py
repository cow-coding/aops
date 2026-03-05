import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChainCallLogCreate(BaseModel):
    chain_name: str
    called_at: datetime
    latency_ms: int | None = None
    input: str | None = None
    output: str | None = None
    status: Literal["success", "error"] = "success"
    error_message: str | None = None


class AgentRunCreate(BaseModel):
    started_at: datetime
    ended_at: datetime | None = None
    chain_calls: list[ChainCallLogCreate] = Field(default=[], max_length=1000)
    status: Literal["success", "error", "running"] = "success"
    error_type: Literal["llm_api_error", "timeout", "validation_error", "exception"] | None = None
    error_message: str | None = None
    error_traceback: str | None = None


class AgentRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    created_at: datetime
    chain_call_count: int


class ChainCallLogDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chain_name: str
    call_order: int
    latency_ms: int | None
    called_at: datetime
    input: str | None
    output: str | None


class RunSummary(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    agent_name: str
    started_at: datetime
    ended_at: datetime | None
    duration_ms: int | None
    chain_names: list[str]
    status: Literal["success", "error", "running"]


class RunListResponse(BaseModel):
    items: list[RunSummary]
    total: int


class RunDetail(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    agent_name: str
    started_at: datetime
    ended_at: datetime | None
    duration_ms: int | None
    chain_calls: list[ChainCallLogDetail]


class RunErrorResponse(BaseModel):
    traceback: str


class ChainFlowEntry(BaseModel):
    chain_name: str
    call_count: int
    avg_latency_ms: float | None


class FlowEdge(BaseModel):
    source: str
    target: str
    count: int


class ChainFlowData(BaseModel):
    nodes: list[ChainFlowEntry]
    edges: list[FlowEdge]
