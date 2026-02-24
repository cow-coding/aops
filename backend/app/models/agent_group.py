import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AgentGroup(Base):
    __tablename__ = "agent_groups"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        primary_key=True,
    )

    agent: Mapped["Agent"] = relationship("Agent", back_populates="agent_groups")  # noqa: F821
    group: Mapped["Group"] = relationship("Group", back_populates="agent_groups")  # noqa: F821
