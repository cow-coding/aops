import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)

EXCLUDED_PATHS = {"/health"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        start = time.monotonic()
        response = await call_next(request)
        latency_ms = int((time.monotonic() - start) * 1000)

        client_ip = request.client.host if request.client else "-"
        msg = f"{request.method} {request.url.path} {response.status_code} {latency_ms}ms (client={client_ip})"

        if response.status_code >= 400:
            logger.warning(msg)
        else:
            logger.info(msg)

        return response
