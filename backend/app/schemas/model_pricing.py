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
