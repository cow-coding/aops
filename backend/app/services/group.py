import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import Group
from app.models.user_group import UserGroup
from app.schemas.group import GroupCreate


async def create_group(
    db: AsyncSession, data: GroupCreate, owner_id: uuid.UUID
) -> Group:
    group = Group(name=data.name, description=data.description)
    db.add(group)
    await db.flush()  # get group.id before adding member

    membership = UserGroup(user_id=owner_id, group_id=group.id, role="owner")
    db.add(membership)
    await db.commit()
    await db.refresh(group)
    return group


async def get_user_groups(db: AsyncSession, user_id: uuid.UUID) -> list[Group]:
    result = await db.execute(
        select(Group)
        .join(UserGroup, Group.id == UserGroup.group_id)
        .where(UserGroup.user_id == user_id)
        .order_by(Group.created_at.desc())
    )
    return list(result.scalars().all())


async def get_group(db: AsyncSession, group_id: uuid.UUID) -> Group | None:
    return await db.get(Group, group_id)


async def get_membership(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
) -> UserGroup | None:
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.group_id == group_id,
            UserGroup.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def is_group_owner(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    membership = await get_membership(db, group_id, user_id)
    return membership is not None and membership.role == "owner"


async def add_member(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID, role: str
) -> UserGroup:
    membership = UserGroup(user_id=user_id, group_id=group_id, role=role)
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership


async def remove_member(db: AsyncSession, membership: UserGroup) -> None:
    await db.delete(membership)
    await db.commit()


async def update_member_role(
    db: AsyncSession, membership: UserGroup, role: str
) -> UserGroup:
    membership.role = role
    await db.commit()
    await db.refresh(membership)
    return membership
