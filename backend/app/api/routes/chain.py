import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chain import ChainCreate, ChainResponse, ChainUpdate
from app.services import agent as agent_service
from app.services import chain as chain_service

router = APIRouter(prefix="/agents/{agent_id}/chains", tags=["chains"])


@router.get("/", response_model=list[ChainResponse])
async def list_chains(agent_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return await chain_service.get_chains(db, agent_id)


@router.post("/", response_model=ChainResponse, status_code=201)
async def create_chain(
    agent_id: uuid.UUID, data: ChainCreate, db: AsyncSession = Depends(get_db)
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    try:
        return await chain_service.create_chain(db, agent_id, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Chain name already exists for this agent")


@router.get("/{chain_id}", response_model=ChainResponse)
async def get_chain(agent_id: uuid.UUID, chain_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    return chain


@router.patch("/{chain_id}", response_model=ChainResponse)
async def update_chain(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    data: ChainUpdate,
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
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
    agent_id: uuid.UUID, chain_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    await chain_service.delete_chain(db, chain)
