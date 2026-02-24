"""Service layer for JWT refresh token management."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import sha256_hex, refresh_token_expires_at
from app.models.refresh_token import RefreshToken


async def store_refresh_token(
    db: AsyncSession, user_id: uuid.UUID, raw_token: str
) -> RefreshToken:
    token = RefreshToken(
        user_id=user_id,
        token_hash=sha256_hex(raw_token),
        expires_at=refresh_token_expires_at(),
    )
    db.add(token)
    await db.commit()
    return token


async def find_refresh_token(
    db: AsyncSession, raw_token: str
) -> RefreshToken | None:
    token_hash = sha256_hex(raw_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalar_one_or_none()


async def revoke_refresh_token(db: AsyncSession, token: RefreshToken) -> None:
    token.revoked = True
    await db.commit()


async def revoke_all_user_tokens(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Revoke all active refresh tokens for a user (full logout)."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
        )
    )
    for token in result.scalars().all():
        token.revoked = True
    await db.commit()
