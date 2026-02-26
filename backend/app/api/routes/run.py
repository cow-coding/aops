import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_api_key_agent, get_chain_reader_auth
from app.core.database import get_db
from app.schemas.run import AgentRunCreate, AgentRunResponse, ChainFlowData
from app.services import agent as agent_service
from app.services import run as run_service

router = APIRouter(prefix="/agents/{agent_id}", tags=["runs"])


@router.post("/runs", response_model=AgentRunResponse, status_code=201)
async def create_run(
    agent_id: uuid.UUID,
    data: AgentRunCreate,
    api_key_agent_id: uuid.UUID = Depends(get_api_key_agent),
    db: AsyncSession = Depends(get_db),
):
    if api_key_agent_id != agent_id:
        raise HTTPException(status_code=403, detail="API key does not belong to this agent.")
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return await run_service.create_run(db, agent_id, data)


@router.get("/flow", response_model=ChainFlowData)
async def get_flow(
    agent_id: uuid.UUID,
    auth=Depends(get_chain_reader_auth),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if isinstance(auth, uuid.UUID):
        # API key: must belong to this agent
        if auth != agent_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        # JWT user: must own or have group access
        if not await agent_service.can_access_agent(db, agent, auth.id):
            raise HTTPException(status_code=403, detail="Access denied.")

    return await run_service.get_flow(db, agent_id)
