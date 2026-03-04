import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_group import AgentGroup
from app.models.user_group import UserGroup
from app.schemas.agent import AgentCreate, AgentUpdate


async def get_agents(db: AsyncSession, user_id: uuid.UUID | None = None) -> list[Agent]:
    """Return agents accessible by user_id (owned or shared via group), or all if None."""
    if user_id is None:
        result = await db.execute(select(Agent).order_by(Agent.created_at.desc()))
        return list(result.scalars().all())

    # Agents owned by user OR shared to a group the user belongs to
    shared_subq = (
        select(AgentGroup.agent_id)
        .join(UserGroup, AgentGroup.group_id == UserGroup.group_id)
        .where(UserGroup.user_id == user_id)
        .scalar_subquery()
    )
    result = await db.execute(
        select(Agent)
        .where(or_(Agent.owner_id == user_id, Agent.id.in_(shared_subq)))
        .order_by(Agent.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def get_agent(db: AsyncSession, agent_id: uuid.UUID) -> Agent | None:
    return await db.get(Agent, agent_id)


async def can_access_agent(
    db: AsyncSession, agent: Agent, user_id: uuid.UUID
) -> bool:
    """Return True if user owns the agent or belongs to a group with access."""
    if agent.owner_id == user_id:
        return True
    result = await db.execute(
        select(AgentGroup)
        .join(UserGroup, AgentGroup.group_id == UserGroup.group_id)
        .where(
            AgentGroup.agent_id == agent.id,
            UserGroup.user_id == user_id,
        )
    )
    return result.first() is not None


async def create_agent(
    db: AsyncSession, data: AgentCreate, owner_id: uuid.UUID | None = None
) -> Agent:
    agent = Agent(**data.model_dump(), owner_id=owner_id)
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


async def update_agent(
    db: AsyncSession, agent: Agent, data: AgentUpdate
) -> Agent:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    await db.commit()
    await db.refresh(agent)
    return agent


async def delete_agent(db: AsyncSession, agent: Agent) -> None:
    await db.delete(agent)
    await db.commit()


