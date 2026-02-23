import base64
import hashlib
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate


# ------------------------------------------------------------------
# Key generation helpers
# ------------------------------------------------------------------

_PREFIX = "aops"


def generate_raw_key(server_url: str) -> str:
    """Generate a new raw API key that embeds *server_url*.

    Format: ``aops_{base64url(server_url)}_{token}``
    """
    encoded_host = base64.urlsafe_b64encode(server_url.encode()).decode().rstrip("=")
    token = secrets.token_urlsafe(32)
    return f"{_PREFIX}_{encoded_host}_{token}"


def hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def key_prefix(raw_key: str) -> str:
    return raw_key[:20]


# ------------------------------------------------------------------
# DB operations
# ------------------------------------------------------------------

async def create_api_key(
    db: AsyncSession,
    agent_id: uuid.UUID,
    data: ApiKeyCreate,
    server_url: str,
) -> tuple[ApiKey, str]:
    """Create and persist a new API key.

    Returns ``(ApiKey, raw_key)`` — the raw key is returned **only here**
    and must be shown to the user immediately; it cannot be recovered later.
    """
    raw_key = generate_raw_key(server_url)
    api_key = ApiKey(
        agent_id=agent_id,
        name=data.name,
        key_prefix=key_prefix(raw_key),
        key_hash=hash_key(raw_key),
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return api_key, raw_key


async def get_api_keys(db: AsyncSession, agent_id: uuid.UUID) -> list[ApiKey]:
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.agent_id == agent_id)
        .order_by(ApiKey.created_at.desc())
    )
    return list(result.scalars().all())


async def get_api_key(db: AsyncSession, key_id: uuid.UUID) -> ApiKey | None:
    return await db.get(ApiKey, key_id)


async def delete_api_key(db: AsyncSession, api_key: ApiKey) -> None:
    await db.delete(api_key)
    await db.commit()


async def find_by_raw_key(db: AsyncSession, raw_key: str) -> ApiKey | None:
    """Look up an ApiKey by the raw key value (hashed for comparison)."""
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == hash_key(raw_key))
    )
    return result.scalar_one_or_none()