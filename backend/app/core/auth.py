"""FastAPI dependency for optional API key authentication.

Routes that include ``Depends(get_api_key_agent)`` will:
- Return the agent_id associated with the key when a valid key is provided.
- Raise HTTP 401 for an invalid or unknown key.
- Return ``None`` when no Authorization header is present (unauthenticated).
"""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.api_key import find_by_raw_key

_bearer = HTTPBearer(auto_error=False)


async def get_api_key_agent(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Return the agent_id for a valid Bearer key, or None if no key provided.

    Raises HTTP 401 if a key is provided but invalid.
    """
    if credentials is None:
        return None

    api_key = await find_by_raw_key(db, credentials.credentials)
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last_used_at without blocking the request
    api_key.last_used_at = datetime.now(timezone.utc)
    await db.commit()

    return api_key.agent_id