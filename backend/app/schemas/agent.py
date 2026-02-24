import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AgentCreate(BaseModel):
    name: str
    description: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class AgentShareRequest(BaseModel):
    group_id: uuid.UUID


class AgentShareResponse(BaseModel):
    agent_id: uuid.UUID
    group_id: uuid.UUID


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
