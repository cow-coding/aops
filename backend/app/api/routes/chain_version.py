import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_chain_reader_auth, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.chain import ChainResponse
from app.schemas.chain_version import ChainVersionResponse
from app.services import agent as agent_service
from app.services import chain as chain_service
from app.services import chain_version as chain_version_service

router = APIRouter(
    prefix="/agents/{agent_id}/chains/{chain_id}/versions",
    tags=["chain-versions"],
)


async def _get_readable_chain(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    auth: User | uuid.UUID,
    db: AsyncSession,
):
    """Access check for read operations — accepts JWT user or API key."""
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if isinstance(auth, uuid.UUID):
        if auth != agent_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        if not await agent_service.can_access_agent(db, agent, auth.id):
            raise HTTPException(status_code=403, detail="Access denied.")
    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    return agent, chain


@router.get("/", response_model=list[ChainVersionResponse])
async def list_versions(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    await _get_readable_chain(agent_id, chain_id, auth, db)
    return await chain_version_service.get_versions(db, chain_id)


@router.get("/{version_id}", response_model=ChainVersionResponse)
async def get_version(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    version_id: uuid.UUID,
    auth: User | uuid.UUID = Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    await _get_readable_chain(agent_id, chain_id, auth, db)
    version = await chain_version_service.get_version(db, version_id)
    if not version or version.chain_id != chain_id:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.post("/{version_id}/rollback", response_model=ChainResponse)
async def rollback_version(
    agent_id: uuid.UUID,
    chain_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can rollback versions.")

    chain = await chain_service.get_chain(db, chain_id)
    if not chain or chain.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Chain not found")

    version = await chain_version_service.get_version(db, version_id)
    if not version or version.chain_id != chain_id:
        raise HTTPException(status_code=404, detail="Version not found")

    versions = await chain_version_service.get_versions(db, chain_id)
    latest = versions[0] if versions else None
    if latest and version.id == latest.id:
        raise HTTPException(status_code=409, detail="Already the latest version")

    return await chain_service.rollback_chain(db, chain, version)
