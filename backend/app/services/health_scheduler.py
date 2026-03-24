"""Background scheduler: periodically pings agent health URLs."""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.health_check import AgentHealthConfig
from app.services.health_check import run_health_check

logger = logging.getLogger(__name__)

# Track last check time per agent in-process
_last_checked: dict[uuid.UUID, datetime] = {}

# Max concurrent pings
_SEMAPHORE = asyncio.Semaphore(20)

# Minimum interval floor (seconds)
_MIN_INTERVAL = 30

# How often the scheduler wakes to check (seconds)
_TICK_INTERVAL = 10


async def _ping_one(agent_id: uuid.UUID) -> None:
    """Open a fresh session, re-fetch config, and run the health check."""
    async with _SEMAPHORE:
        try:
            async with async_session_factory() as db:
                result = await db.execute(
                    select(AgentHealthConfig).where(AgentHealthConfig.agent_id == agent_id)
                )
                config = result.scalar_one_or_none()
                if config is None or not config.enabled:
                    return
                log = await run_health_check(db, config)
                _last_checked[config.agent_id] = log.checked_at
                logger.debug(
                    "Health check agent=%s status=%s latency=%sms",
                    config.agent_id,
                    log.status,
                    log.latency_ms,
                )
        except Exception as exc:
            logger.error("Health check failed for agent %s: %s", agent_id, exc)


async def _due_agent_ids() -> list[uuid.UUID]:
    """Return agent_ids whose health check is due.

    Queries only scalar columns so no ORM objects escape the session.
    """
    now = datetime.now(timezone.utc)
    async with async_session_factory() as db:
        result = await db.execute(
            select(AgentHealthConfig.agent_id, AgentHealthConfig.interval_sec).where(
                AgentHealthConfig.enabled.is_(True)
            )
        )
        rows = result.all()

    due = []
    for row in rows:
        interval = max(_MIN_INTERVAL, row.interval_sec)
        last = _last_checked.get(row.agent_id)
        if last is None or (now - last).total_seconds() >= interval:
            due.append(row.agent_id)
    return due


async def health_scheduler_loop() -> None:
    """Main scheduler loop. Runs forever, spawning pings for due agents."""
    logger.info("Health scheduler started (tick=%ds)", _TICK_INTERVAL)
    while True:
        try:
            due = await _due_agent_ids()
            if due:
                await asyncio.gather(
                    *[_ping_one(agent_id) for agent_id in due],
                    return_exceptions=True,
                )
        except Exception as exc:
            logger.error("Scheduler tick error: %s", exc)
        await asyncio.sleep(_TICK_INTERVAL)
