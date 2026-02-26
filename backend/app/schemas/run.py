import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChainCallLogCreate(BaseModel):
    chain_name: str
    called_at: datetime
    latency_ms: int | None = None


class AgentRunCreate(BaseModel):
    started_at: datetime
    ended_at: datetime | None = None
    chain_calls: list[ChainCallLogCreate] = []


class AgentRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    created_at: datetime
    chain_call_count: int


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
