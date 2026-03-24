from fastapi import APIRouter

from app.api.routes.agent import router as agent_router
from app.api.routes.api_key import router as api_key_router
from app.api.routes.auth import router as auth_router
from app.api.routes.chain import router as chain_router
from app.api.routes.chain_version import router as chain_version_router
from app.api.routes.group import router as group_router
from app.api.routes.model_pricing import router as model_pricing_router
from app.api.routes.monitoring import router as monitoring_router
from app.api.routes.run import router as run_router
from app.api.routes.traces import router as traces_router
from app.api.routes.user import router as user_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(agent_router)
api_router.include_router(api_key_router)
api_router.include_router(chain_router)
api_router.include_router(chain_version_router)
api_router.include_router(group_router)
api_router.include_router(model_pricing_router)
api_router.include_router(run_router)
api_router.include_router(traces_router)
api_router.include_router(user_router)
api_router.include_router(monitoring_router)


@api_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "AgentOps API"}
