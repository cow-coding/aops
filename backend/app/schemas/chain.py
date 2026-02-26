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


class ChainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    name: str
    description: str | None
    persona: str | None
    content: str
    show_in_flow: bool
    created_at: datetime
    updated_at: datetime
