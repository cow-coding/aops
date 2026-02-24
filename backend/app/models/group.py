import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user_groups: Mapped[list["UserGroup"]] = relationship(  # noqa: F821
        "UserGroup", back_populates="group", cascade="all, delete-orphan"
    )
    agent_groups: Mapped[list["AgentGroup"]] = relationship(  # noqa: F821
        "AgentGroup", back_populates="group", cascade="all, delete-orphan"
    )
