from fastapi import APIRouter

from app.api.routes.agent import router as agent_router
from app.api.routes.chain import router as chain_router
from app.api.routes.chain_version import router as chain_version_router

api_router = APIRouter()
api_router.include_router(agent_router)
api_router.include_router(chain_router)
api_router.include_router(chain_version_router)


@api_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "AgentOps API"}
