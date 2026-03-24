import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.health_check import (
    HealthCheckLogResponse,
    HealthConfigCreate,
    HealthConfigResponse,
    HealthConfigUpdate,
)
from app.services import agent as agent_service
from app.services import health_check as health_check_service

router = APIRouter(prefix="/agents/{agent_id}/health", tags=["health-check"])


async def _get_accessible_agent(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Read access: owner or any group member."""
    agent = await agent_service.get_agent(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    if not await agent_service.can_access_agent(db, agent, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")
    return agent


async def _get_owner_agent(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Write access: owner only."""
    agent = await agent_service.get_agent(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    if agent.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the owner can manage health config."
        )
    return agent


# ─── Config endpoints ──────────────────────────────────────────────────────────


@router.post("/config", response_model=HealthConfigResponse, status_code=201)
async def create_health_config(
    agent_id: uuid.UUID,
    body: HealthConfigCreate,
    agent=Depends(_get_owner_agent),
    db: AsyncSession = Depends(get_db),
):
    existing = await health_check_service.get_health_config(db, agent_id)
    if existing:
        raise HTTPException(
            status_code=409, detail="Health config already exists. Use PATCH to update."
        )
    try:
        return await health_check_service.create_health_config(db, agent_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/config", response_model=HealthConfigResponse)
async def get_health_config(
    agent_id: uuid.UUID,
    agent=Depends(_get_accessible_agent),
    db: AsyncSession = Depends(get_db),
):
    config = await health_check_service.get_health_config(db, agent_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Health config not found.")
    return config


@router.patch("/config", response_model=HealthConfigResponse)
async def update_health_config(
    agent_id: uuid.UUID,
    body: HealthConfigUpdate,
    agent=Depends(_get_owner_agent),
    db: AsyncSession = Depends(get_db),
):
    config = await health_check_service.get_health_config(db, agent_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Health config not found.")
    try:
        return await health_check_service.update_health_config(db, config, body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/config", status_code=204)
async def delete_health_config(
    agent_id: uuid.UUID,
    agent=Depends(_get_owner_agent),
    db: AsyncSession = Depends(get_db),
):
    config = await health_check_service.get_health_config(db, agent_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Health config not found.")
    await health_check_service.delete_health_config(db, config)


# ─── Log endpoints ─────────────────────────────────────────────────────────────


@router.get("/checks", response_model=list[HealthCheckLogResponse])
async def get_health_check_logs(
    agent_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=1440),
    agent=Depends(_get_accessible_agent),
    db: AsyncSession = Depends(get_db),
):
    return await health_check_service.get_health_check_logs(db, agent_id, limit)


@router.post("/checks/trigger", response_model=HealthCheckLogResponse, status_code=201)
async def trigger_health_check(
    agent_id: uuid.UUID,
    agent=Depends(_get_owner_agent),
    db: AsyncSession = Depends(get_db),
):
    config = await health_check_service.get_health_config(db, agent_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Health config not found.")
    try:
        return await health_check_service.run_health_check(db, config)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
