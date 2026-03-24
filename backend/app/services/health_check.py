import asyncio
import ipaddress
import logging
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.health_check import AgentHealthConfig, HealthCheckLog
from app.schemas.health_check import HealthConfigCreate, HealthConfigUpdate

logger = logging.getLogger(__name__)

# Private IP ranges blocked for SSRF prevention
_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def _is_private_ip(addr: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return any(addr in net for net in _PRIVATE_NETWORKS)


def _extract_host(url: str) -> str:
    """Extract hostname from URL string."""
    no_scheme = url.split("://", 1)[-1]
    host_part = no_scheme.split("/")[0]
    return host_part.split(":")[0]  # strip port


def _validate_no_ssrf(url: str) -> None:
    """Static check: block bare IPs and obvious localhost aliases at config save time."""
    if settings.ALLOW_PRIVATE_HEALTH_URLS:
        logger.warning("Private health URLs allowed — do not use in production")
        return
    host = _extract_host(url)
    try:
        addr = ipaddress.ip_address(host)
        if _is_private_ip(addr):
            raise ValueError(f"health_url targets a private/loopback address: {host}")
    except ValueError as exc:
        if "private" in str(exc) or "loopback" in str(exc):
            raise
        # Not a bare IP — block obvious localhost aliases
        if host.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            raise ValueError(f"health_url targets a private/loopback address: {host}")


async def _resolve_and_validate(url: str) -> None:
    """DNS-aware SSRF check: resolve hostname and validate each returned IP.

    Defends against DNS rebinding where a hostname initially resolves to a
    public IP but later rebinds to a private one.
    """
    if settings.ALLOW_PRIVATE_HEALTH_URLS:
        logger.warning("Private health URLs allowed — do not use in production")
        return
    host = _extract_host(url)
    loop = asyncio.get_running_loop()
    try:
        infos = await loop.getaddrinfo(host, None)
    except OSError as exc:
        raise ValueError(f"DNS resolution failed for {host!r}: {exc}") from exc
    for _family, _type, _proto, _canonname, sockaddr in infos:
        ip_str = sockaddr[0]
        try:
            addr = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if _is_private_ip(addr):
            raise ValueError(f"DNS resolves to private address: {addr}")


async def _handshake(url: str, timeout: int) -> None:
    """Verify health URL ownership via connect handshake.

    POSTs {"type": "connect", "code": <random>} and expects {"code": <same>} back.
    Raises ValueError on failure.
    """
    code = uuid.uuid4().hex
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json={"type": "connect", "code": code})
    except httpx.TimeoutException:
        raise ValueError("Health URL verification failed: connection timed out")
    except httpx.RequestError as exc:
        raise ValueError(f"Health URL verification failed: {exc}")

    if response.status_code >= 400:
        raise ValueError(
            f"Health URL verification failed: server returned {response.status_code}"
        )
    try:
        data = response.json()
    except Exception:
        raise ValueError("Health URL verification failed: invalid JSON response")
    if data.get("code") != code:
        raise ValueError("Health URL verification failed: code mismatch")


# ─── CRUD ──────────────────────────────────────────────────────────────────────


async def get_health_config(
    db: AsyncSession, agent_id: uuid.UUID
) -> AgentHealthConfig | None:
    result = await db.execute(
        select(AgentHealthConfig).where(AgentHealthConfig.agent_id == agent_id)
    )
    return result.scalar_one_or_none()


async def create_health_config(
    db: AsyncSession, agent_id: uuid.UUID, data: HealthConfigCreate
) -> AgentHealthConfig:
    _validate_no_ssrf(data.health_url)
    await _resolve_and_validate(data.health_url)
    await _handshake(data.health_url, timeout=data.timeout_sec)

    interval = max(30, data.interval_sec)
    now = datetime.now(timezone.utc)
    config = AgentHealthConfig(
        agent_id=agent_id,
        health_url=data.health_url,
        interval_sec=interval,
        timeout_sec=data.timeout_sec,
        enabled=data.enabled,
        consecutive_failures_threshold=data.consecutive_failures_threshold,
        verified=True,
        verified_at=now,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def update_health_config(
    db: AsyncSession, config: AgentHealthConfig, data: HealthConfigUpdate
) -> AgentHealthConfig:
    updates = data.model_dump(exclude_none=True)
    if "health_url" in updates:
        _validate_no_ssrf(updates["health_url"])
        await _resolve_and_validate(updates["health_url"])
        # Re-verify on URL change
        await _handshake(updates["health_url"], timeout=config.timeout_sec)
        updates["verified"] = True
        updates["verified_at"] = datetime.now(timezone.utc)
    if "interval_sec" in updates:
        updates["interval_sec"] = max(30, updates["interval_sec"])
    for field, value in updates.items():
        setattr(config, field, value)
    await db.commit()
    await db.refresh(config)
    return config


async def delete_health_config(db: AsyncSession, config: AgentHealthConfig) -> None:
    await db.delete(config)
    await db.commit()


# ─── Health Check Log ──────────────────────────────────────────────────────────


async def get_health_check_logs(
    db: AsyncSession, agent_id: uuid.UUID, limit: int = 50
) -> list[HealthCheckLog]:
    result = await db.execute(
        select(HealthCheckLog)
        .where(HealthCheckLog.agent_id == agent_id)
        .order_by(desc(HealthCheckLog.checked_at))
        .limit(limit)
    )
    return list(result.scalars().all())


async def run_health_check(
    db: AsyncSession,
    config: AgentHealthConfig,
) -> HealthCheckLog:
    """Perform a POST ping and persist the result."""
    _validate_no_ssrf(config.health_url)
    await _resolve_and_validate(config.health_url)

    status = "down"
    latency_ms: int | None = None
    status_code: int | None = None
    error_message: str | None = None
    checked_at = datetime.now(timezone.utc)

    try:
        async with httpx.AsyncClient(timeout=config.timeout_sec) as client:
            start = datetime.now(timezone.utc)
            response = await client.post(
                config.health_url,
                json={"type": "health"},
            )
            end = datetime.now(timezone.utc)
            latency_ms = int((end - start).total_seconds() * 1000)
            status_code = response.status_code
            if response.status_code < 400:
                try:
                    body = response.json()
                    status = "up" if body.get("status") == "ok" else "down"
                except Exception:
                    status = "down"
                    error_message = "Invalid JSON response"
            else:
                status = "down"
    except httpx.TimeoutException:
        error_message = "Request timed out"
        status = "down"
    except httpx.RequestError as exc:
        error_message = str(exc)[:512]
        status = "down"

    log = HealthCheckLog(
        agent_id=config.agent_id,
        checked_at=checked_at,
        status=status,
        latency_ms=latency_ms,
        status_code=status_code,
        error_message=error_message,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
