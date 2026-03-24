import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator


class HealthConfigCreate(BaseModel):
    health_url: str = Field(..., max_length=2048)
    interval_sec: int = Field(default=60, ge=30, le=86400)
    timeout_sec: int = Field(default=10, ge=1, le=60)
    enabled: bool = True
    consecutive_failures_threshold: int = Field(default=3, ge=1, le=20)

    @field_validator("health_url")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("health_url must start with http:// or https://")
        return v


class HealthConfigUpdate(BaseModel):
    health_url: str | None = Field(default=None, max_length=2048)
    interval_sec: int | None = Field(default=None, ge=30, le=86400)
    timeout_sec: int | None = Field(default=None, ge=1, le=60)
    enabled: bool | None = None
    consecutive_failures_threshold: int | None = Field(default=None, ge=1, le=20)

    @field_validator("health_url")
    @classmethod
    def validate_url_scheme(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith(("http://", "https://")):
            raise ValueError("health_url must start with http:// or https://")
        return v


class HealthConfigResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    health_url: str
    interval_sec: int
    timeout_sec: int
    enabled: bool
    consecutive_failures_threshold: int
    verified: bool
    verified_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HealthCheckLogResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    checked_at: datetime
    status: Literal["up", "down"]
    latency_ms: int | None
    status_code: int | None
    error_message: str | None

    model_config = {"from_attributes": True}
