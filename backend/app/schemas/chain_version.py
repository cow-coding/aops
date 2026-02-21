import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChainVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chain_id: uuid.UUID
    persona: str
    content: str
    message: str
    version_number: int
    created_at: datetime
