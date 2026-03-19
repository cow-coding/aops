from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.model_pricing import (
    ActiveModelResponse,
    CostByAgentResponse,
    CostSummaryResponse,
    CostTimeseriesResponse,
    ModelPricingListResponse,
    ModelPricingResponse,
    SyncResultResponse,
)
from app.services import model_pricing as model_pricing_service

router = APIRouter(prefix="/model-pricing", tags=["model-pricing"])


@router.get("/", response_model=ModelPricingListResponse)
async def list_model_pricing(
    provider: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get active model names to pin them at the top
    active_models = await model_pricing_service.get_active_models(db, current_user.id)
    active_names = {m.model_name for m in active_models}

    items, total = await model_pricing_service.list_model_pricing(
        db, provider=provider, search=search, limit=limit, offset=offset,
        active_names=active_names or None,
    )
    return ModelPricingListResponse(items=items, total=total)


@router.post("/sync", response_model=SyncResultResponse, status_code=200)
async def sync_model_pricing(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    synced = await model_pricing_service.sync_model_pricing(db)
    return SyncResultResponse(
        synced=synced,
        message=f"Successfully synced {synced} models.",
    )


@router.get("/active", response_model=list[ActiveModelResponse])
async def get_active_models(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await model_pricing_service.get_active_models(db, current_user.id)


@router.get("/cost-summary", response_model=CostSummaryResponse)
async def get_cost_summary(
    hours: int | None = Query(default=None, description="Filter to last N hours"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await model_pricing_service.get_cost_summary(db, current_user.id, hours=hours)


@router.get("/cost-by-agent", response_model=CostByAgentResponse)
async def get_cost_by_agent(
    hours: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await model_pricing_service.get_cost_by_agent(db, current_user.id, hours=hours, limit=limit)


@router.get("/cost-timeseries", response_model=CostTimeseriesResponse)
async def get_cost_timeseries(
    hours: int | None = Query(default=None),
    group_by: str = Query(default="agent", pattern="^(agent|model)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await model_pricing_service.get_cost_timeseries(db, current_user.id, hours=hours, group_by=group_by)


@router.get("/{model_name:path}", response_model=ModelPricingResponse)
async def get_model_pricing(
    model_name: str,
    db: AsyncSession = Depends(get_db),
):
    pricing = await model_pricing_service.get_model_pricing(db, model_name)
    if not pricing:
        raise HTTPException(status_code=404, detail="Model pricing not found.")
    return pricing
