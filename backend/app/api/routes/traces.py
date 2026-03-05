import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.run import RunDetail, RunListResponse, RunSummary
from app.services import run as run_service

router = APIRouter(prefix="/runs", tags=["traces"])


@router.get("/", response_model=RunListResponse)
async def list_runs(
    agent_id: uuid.UUID | None = Query(default=None),
    started_after: datetime | None = Query(default=None),
    started_before: datetime | None = Query(default=None),
    source_chain: str | None = Query(default=None),
    target_chain: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await run_service.list_runs(
        db,
        user_id=current_user.id,
        agent_id=agent_id,
        started_after=started_after,
        started_before=started_before,
        source_chain=source_chain,
        target_chain=target_chain,
        limit=limit,
        offset=offset,
    )
    return RunListResponse(items=items, total=total)


@router.get("/{run_id}", response_model=RunDetail)
async def get_run(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    run = await run_service.get_run(db, run_id, current_user.id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
