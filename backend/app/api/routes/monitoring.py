from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.monitoring import MonitoringSummaryResponse
from app.services import monitoring as monitoring_service

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/summary", response_model=MonitoringSummaryResponse)
async def get_monitoring_summary(
    hours: int = Query(
        default=24,
        ge=1,
        le=8760,
        description="Time window in hours (1–8760). Default: 24h.",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await monitoring_service.get_monitoring_summary(db, current_user.id, hours)
