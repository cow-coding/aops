import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(asctime)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import async_session_factory
from app.core.limiter import limiter
from app.middleware.logging import RequestLoggingMiddleware
from app.services.model_pricing import sync_model_pricing

logger = logging.getLogger(__name__)

_DEFAULT_SECRET_KEY = "change-me-in-production-use-a-long-random-string"
if settings.SECRET_KEY == _DEFAULT_SECRET_KEY:
    logging.warning(
        "WARNING: Using default SECRET_KEY. "
        "Set a secure SECRET_KEY in .env before deploying."
    )


async def _pricing_sync_loop() -> None:
    """Sync model pricing on startup then every 24h."""
    while True:
        try:
            async with async_session_factory() as db:
                count = await sync_model_pricing(db)
                logger.info("Model pricing sync: %d models", count)
        except Exception as e:
            logger.error("Model pricing sync failed: %s", e)
        await asyncio.sleep(86400)  # 24 hours


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_pricing_sync_loop())
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
