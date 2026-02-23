import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChainCreate(BaseModel):
    name: str
    description: str | None = None
    persona: str | None = None
    content: str = Field(min_length=1)
    message: str = Field(default="Initial version", max_length=500)


class ChainUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    persona: str | None = None
    content: str | None = None
    message: str | None = Field(default=None, max_length=500)


class ChainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    name: str
    description: str | None
    persona: str | None
    content: str
    created_at: datetime
    updated_at: datetime
