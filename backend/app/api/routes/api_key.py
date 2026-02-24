import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse
from app.services import agent as agent_service
from app.services import api_key as api_key_service

router = APIRouter(prefix="/agents/{agent_id}/api-keys", tags=["api-keys"])


def _server_url(request: Request) -> str:
    """Resolve the server URL to embed in the key.

    Uses ``settings.SERVER_URL`` when configured; falls back to the
    origin of the incoming request (works for local dev).
    """
    if settings.SERVER_URL:
        return settings.SERVER_URL.rstrip("/")
    return str(request.base_url).rstrip("/")


@router.post("/", response_model=ApiKeyCreateResponse, status_code=201)
async def create_api_key(
    agent_id: uuid.UUID,
    data: ApiKeyCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Issue a new API key for the given agent.

    The ``key`` field in the response is shown **only once**.
    Store it securely — it cannot be retrieved again.
    """
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can manage API keys.")

    api_key, raw_key = await api_key_service.create_api_key(
        db, agent_id, data, server_url=_server_url(request)
    )
    return ApiKeyCreateResponse(
        id=api_key.id,
        agent_id=api_key.agent_id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        created_at=api_key.created_at,
        last_used_at=api_key.last_used_at,
        key=raw_key,
    )


@router.get("/", response_model=list[ApiKeyResponse])
async def list_api_keys(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if not await agent_service.can_access_agent(db, agent, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return await api_key_service.get_api_keys(db, agent_id)


@router.delete("/{key_id}", status_code=204)
async def revoke_api_key(
    agent_id: uuid.UUID,
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can manage API keys.")

    api_key = await api_key_service.get_api_key(db, key_id)
    if not api_key or api_key.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="API key not found")

    await api_key_service.delete_api_key(db, api_key)