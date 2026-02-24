"""FastAPI dependencies for API key and JWT user authentication."""

import uuid
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.services.api_key import find_by_raw_key

_bearer = HTTPBearer(auto_error=False)


async def get_api_key_agent(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return the agent_id from the X-API-Key header.

    Raises HTTP 401 if header is missing or key is invalid.
    """
    api_key_value = request.headers.get("X-API-Key")
    if api_key_value is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key header required.",
        )

    api_key = await find_by_raw_key(db, api_key_value)
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
        )

    api_key.last_used_at = datetime.now(timezone.utc)
    await db.commit()
    return api_key.agent_id


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated User from a JWT Bearer token.

    Raises HTTP 401 if no token is provided or the token is invalid.
    """
    from app.models.user import User

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise JWTError("Not an access token")
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise JWTError("Missing subject")
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_chain_reader_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Auth for chain/version read routes: JWT Bearer OR X-API-Key header.

    Returns:
        User  — if JWT access token is valid (browser)
        uuid.UUID — agent_id if X-API-Key header is valid (SDK)
    Raises HTTP 401 if neither is provided or both are invalid.
    """
    from app.models.user import User

    # 1. Try JWT Bearer (browser)
    if credentials is not None:
        try:
            payload = decode_token(credentials.credentials)
            if payload.get("type") == "access":
                user_id_str: str = payload.get("sub", "")
                if user_id_str:
                    user = await db.get(User, uuid.UUID(user_id_str))
                    if user is not None:
                        return user
        except (JWTError, ValueError):
            pass

    # 2. Try X-API-Key header (SDK)
    api_key_value = request.headers.get("X-API-Key")
    if api_key_value:
        api_key = await find_by_raw_key(db, api_key_value)
        if api_key is not None:
            api_key.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            return api_key.agent_id  # uuid.UUID

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a Bearer token or X-API-Key header.",
        headers={"WWW-Authenticate": "Bearer"},
    )
