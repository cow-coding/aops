import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chain_version import ChainVersionResponse
from app.services import agent as agent_service
from app.services import chain as chain_service
from app.services import chain_version as chain_version_service

router = APIRouter(
    prefix="/agents/{agent_id}/chains/{chain_id}/versions",
    tags=["chain-versions"],
)


@router.get("/", response_model=list[ChainVersionResponse])
async def list_versions(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    return await chain_version_service.get_versions(db, chain_id)


@router.get("/{version_id}", response_model=ChainVersionResponse)
async def get_version(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    version = await chain_version_service.get_version(db, version_id)
    if not version or version.chain_id != chain_id:
        raise HTTPException(status_code=404, detail="Version not found")
    return version
