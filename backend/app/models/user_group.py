import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserGroup(Base):
    __tablename__ = "user_groups"
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'member')", name="user_groups_role_check"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(String(10), nullable=False, default="member")

    user: Mapped["User"] = relationship("User", back_populates="user_groups")  # noqa: F821
    group: Mapped["Group"] = relationship("Group", back_populates="user_groups")  # noqa: F821
