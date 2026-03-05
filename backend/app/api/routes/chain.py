import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_chain_reader_auth, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.chain import ChainCallLogResponse, ChainCreate, ChainLogListResponse, ChainReorderRequest, ChainResponse, ChainStatsResponse, ChainTimeseriesResponse, ChainUpdate
from app.services import agent as agent_service
from app.services import chain as chain_service

router = APIRouter(prefix="/agents/{agent_id}/chains", tags=["chains"])


async def _get_readable_agent(
    agent_id: uuid.UUID,
    auth: User | uuid.UUID,
    db: AsyncSession,
):
    """Access check for read operations — accepts JWT user or API key."""
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if isinstance(auth, uuid.UUID):
        # API key auth: the key must belong to this exact agent
        if auth != agent_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        if not await agent_service.can_access_agent(db, agent, auth.id):
            raise HTTPException(status_code=403, detail="Access denied.")
    return agent


async def _get_owned_agent(
    agent_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
):
    """Access check for write operations — JWT user must be owner."""
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can modify chains.")
    return agent


@router.get("/", response_model=list[ChainResponse])
async def list_chains(
    agent_id: uuid.UUID,
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    await _get_readable_agent(agent_id, auth, db)
    return await chain_service.get_chains(db, agent_id)


@router.post("/", response_model=ChainResponse, status_code=201)
async def create_chain(
    agent_id: uuid.UUID,
    data: ChainCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_agent(agent_id, current_user, db)
    try:
        return await chain_service.create_chain(db, agent_id, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Chain name already exists for this agent")


@router.get("/{chain_id}", response_model=ChainResponse)
async def get_chain(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    await _get_readable_agent(agent_id, auth, db)
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    return chain


@router.get("/{chain_id}/stats", response_model=ChainStatsResponse)
async def get_chain_stats(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    started_after: datetime | None = Query(default=None),
    started_before: datetime | None = Query(default=None),
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    await _get_readable_agent(agent_id, auth, db)
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    return await chain_service.get_chain_stats(db, chain_id, started_after, started_before)


@router.get("/{chain_id}/stats/timeseries", response_model=ChainTimeseriesResponse)
async def get_chain_timeseries(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    range: str = Query(default="24h", pattern="^(1h|24h|7d|30d)$"),
    started_after: datetime | None = Query(default=None),
    started_before: datetime | None = Query(default=None),
    granularity: str | None = Query(default=None, pattern="^(5m|1h|6h|1d)$"),
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    await _get_readable_agent(agent_id, auth, db)
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    return await chain_service.get_chain_timeseries(
        db, chain_id, range, started_after, started_before, granularity
    )


@router.get("/{chain_id}/logs", response_model=ChainLogListResponse)
async def get_chain_logs(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    limit: int = Query(default=30, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    await _get_readable_agent(agent_id, auth, db)
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    items, total = await chain_service.get_chain_logs(db, chain_id, limit, offset)
    return ChainLogListResponse(items=items, total=total)


@router.patch("/reorder", status_code=204)
async def reorder_chains(
    agent_id: uuid.UUID,
    data: ChainReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_agent(agent_id, current_user, db)
    await chain_service.reorder_chains(db, agent_id, data.chain_ids)


@router.patch("/{chain_id}", response_model=ChainResponse)
async def update_chain(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    data: ChainUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_agent(agent_id, current_user, db)
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    try:
        return await chain_service.update_chain(db, chain, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Chain name already exists for this agent")


@router.delete("/{chain_id}", status_code=204)
async def delete_chain(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_agent(agent_id, current_user, db)
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    await chain_service.delete_chain(db, chain)
