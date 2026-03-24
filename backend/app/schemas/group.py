import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime


class UserInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    name: str


class MemberAdd(BaseModel):
    email: EmailStr
    role: Literal["owner", "member"] = "member"


class MemberUpdate(BaseModel):
    role: Literal["owner", "member"]


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    group_id: uuid.UUID
    role: str
    user: UserInfo | None = None
