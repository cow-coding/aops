import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_chain_reader_auth, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentResponse, AgentStatsResponse, AgentTimeseriesResponse, AgentUpdate
from app.services import agent as agent_service

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=list[AgentResponse])
async def list_agents(
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    if isinstance(auth, uuid.UUID):
        # API key auth: return only the agent the key belongs to
        agent = await agent_service.get_agent(db, auth)
        return [agent] if agent else []
    return await agent_service.get_agents(db, user_id=auth.id)


@router.post("/", response_model=AgentResponse, status_code=201)
async def create_agent(
    data: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await agent_service.create_agent(db, data, owner_id=current_user.id)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: uuid.UUID,
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")
    if isinstance(auth, uuid.UUID):
        # API key auth: key must belong to this exact agent
        if auth != agent_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        if not await agent_service.can_access_agent(db, agent, auth.id):
            raise HTTPException(status_code=403, detail="Access denied.")
    return agent


@router.get("/{agent_id}/stats", response_model=AgentStatsResponse)
async def get_agent_stats(
    agent_id: uuid.UUID,
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")
    if isinstance(auth, uuid.UUID):
        if auth != agent_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        if not await agent_service.can_access_agent(db, agent, auth.id):
            raise HTTPException(status_code=403, detail="Access denied.")
    return await agent_service.get_agent_stats(db, agent_id)


@router.get("/{agent_id}/stats/timeseries", response_model=AgentTimeseriesResponse)
async def get_agent_timeseries(
    agent_id: uuid.UUID,
    range: str = Query(default="24h", pattern="^(1h|24h|7d|30d)$"),
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")
    if isinstance(auth, uuid.UUID):
        if auth != agent_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        if not await agent_service.can_access_agent(db, agent, auth.id):
            raise HTTPException(status_code=403, detail="Access denied.")
    return await agent_service.get_agent_timeseries(db, agent_id, range)


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: uuid.UUID,
    data: AgentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")
    # Only owner can update
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can modify this agent.")
    return await agent_service.update_agent(db, agent, data)


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this agent.")
    await agent_service.delete_agent(db, agent)
