from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=UserResponse)
async def search_user_by_email(
    email: str = Query(..., description="Exact email address to look up"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return user
