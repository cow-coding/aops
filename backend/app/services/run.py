import uuid
from collections import defaultdict
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent import Agent
from app.models.agent_group import AgentGroup
from app.models.agent_run import AgentRun, ChainCallLog, RunEdge, RunErrorDetail
from app.models.user_group import UserGroup
from app.schemas.run import (
    AgentRunCreate,
    AgentRunResponse,
    ChainCallLogDetail,
    ChainFlowData,
    ChainFlowEntry,
    FlowEdge,
    RunDetail,
    RunSummary,
)


async def create_run(
    db: AsyncSession, agent_id: uuid.UUID, data: AgentRunCreate
) -> AgentRunResponse:
    run = AgentRun(
        agent_id=agent_id,
        started_at=data.started_at,
        ended_at=data.ended_at,
        status=data.status,
        error_type=data.error_type,
        error_message=data.error_message,
    )
    db.add(run)
    await db.flush()

    chain_names: list[str] = []
    for i, call in enumerate(data.chain_calls):
        log = ChainCallLog(
            run_id=run.id,
            agent_id=agent_id,
            chain_name=call.chain_name,
            called_at=call.called_at,
            call_order=i,
            latency_ms=call.latency_ms,
            input=call.input,
            output=call.output,
            status=call.status,
            error_message=call.error_message,
            model_name=call.model_name,
            prompt_tokens=call.prompt_tokens,
            completion_tokens=call.completion_tokens,
            total_tokens=call.total_tokens,
        )
        db.add(log)
        chain_names.append(call.chain_name)

    for src, tgt in zip(chain_names, chain_names[1:]):
        db.add(RunEdge(run_id=run.id, agent_id=agent_id, source_chain=src, target_chain=tgt))

    if data.error_traceback:
        db.add(RunErrorDetail(run_id=run.id, traceback=data.error_traceback))

    await db.commit()
    await db.refresh(run)

    return AgentRunResponse(
        id=run.id,
        agent_id=run.agent_id,
        started_at=run.started_at,
        ended_at=run.ended_at,
        created_at=run.created_at,
        chain_call_count=len(data.chain_calls),
    )


def _duration_ms(started_at: datetime, ended_at: datetime | None) -> int | None:
    if ended_at is None:
        return None
    return int((ended_at - started_at).total_seconds() * 1000)


async def list_runs(
    db: AsyncSession,
    user_id: uuid.UUID,
    agent_id: uuid.UUID | None = None,
    started_after: datetime | None = None,
    started_before: datetime | None = None,
    source_chain: str | None = None,
    target_chain: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[RunSummary], int]:
    # Subquery: agent_ids accessible by user (owned or via group)
    shared_subq = (
        select(AgentGroup.agent_id)
        .join(UserGroup, AgentGroup.group_id == UserGroup.group_id)
        .where(UserGroup.user_id == user_id)
        .scalar_subquery()
    )

    def _apply_filters(q):
        if agent_id is not None:
            q = q.where(AgentRun.agent_id == agent_id)
        if started_after is not None:
            q = q.where(AgentRun.started_at >= started_after)
        if started_before is not None:
            q = q.where(AgentRun.started_at <= started_before)
        if source_chain is not None and target_chain is not None:
            edge_subq = (
                select(RunEdge.run_id)
                .where(RunEdge.source_chain == source_chain, RunEdge.target_chain == target_chain)
            )
            if agent_id is not None:
                edge_subq = edge_subq.where(RunEdge.agent_id == agent_id)
            q = q.where(AgentRun.id.in_(edge_subq.scalar_subquery()))
        if status is not None:
            q = q.where(AgentRun.status == status)
        return q

    base_filter = _apply_filters(
        select(AgentRun)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .where(or_(Agent.owner_id == user_id, AgentRun.agent_id.in_(shared_subq)))
    )

    # COUNT query
    count_stmt = select(func.count()).select_from(base_filter.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = _apply_filters(
        select(AgentRun, Agent.name.label("agent_name"))
        .join(Agent, AgentRun.agent_id == Agent.id)
        .where(or_(Agent.owner_id == user_id, AgentRun.agent_id.in_(shared_subq)))
    )

    stmt = stmt.order_by(AgentRun.started_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()

    if not rows:
        return [], total

    run_ids = [row.AgentRun.id for row in rows]

    # Fetch chain names for all runs in one query, ordered by call_order
    chain_rows = (await db.execute(
        select(ChainCallLog.run_id, ChainCallLog.chain_name, ChainCallLog.model_name)
        .where(ChainCallLog.run_id.in_(run_ids))
        .order_by(ChainCallLog.run_id, ChainCallLog.call_order)
    )).all()

    chains_by_run: dict[uuid.UUID, list[str]] = defaultdict(list)
    models_by_run: dict[uuid.UUID, list[str]] = defaultdict(list)
    for cr in chain_rows:
        chains_by_run[cr.run_id].append(cr.chain_name)
        if cr.model_name and cr.model_name not in models_by_run[cr.run_id]:
            models_by_run[cr.run_id].append(cr.model_name)

    items = [
        RunSummary(
            id=row.AgentRun.id,
            agent_id=row.AgentRun.agent_id,
            agent_name=row.agent_name,
            started_at=row.AgentRun.started_at,
            ended_at=row.AgentRun.ended_at,
            duration_ms=_duration_ms(row.AgentRun.started_at, row.AgentRun.ended_at),
            chain_names=chains_by_run[row.AgentRun.id],
            model_names=models_by_run[row.AgentRun.id],
            status=row.AgentRun.status,
        )
        for row in rows
    ]
    return items, total


async def get_run(
    db: AsyncSession, run_id: uuid.UUID, user_id: uuid.UUID
) -> RunDetail | None:
    shared_subq = (
        select(AgentGroup.agent_id)
        .join(UserGroup, AgentGroup.group_id == UserGroup.group_id)
        .where(UserGroup.user_id == user_id)
        .scalar_subquery()
    )

    result = await db.execute(
        select(AgentRun, Agent.name.label("agent_name"))
        .join(Agent, AgentRun.agent_id == Agent.id)
        .where(
            AgentRun.id == run_id,
            or_(Agent.owner_id == user_id, AgentRun.agent_id.in_(shared_subq)),
        )
        .options(selectinload(AgentRun.chain_calls))
    )
    row = result.first()
    if row is None:
        return None

    run = row.AgentRun
    chain_calls = sorted(run.chain_calls, key=lambda c: c.call_order)

    return RunDetail(
        id=run.id,
        agent_id=run.agent_id,
        agent_name=row.agent_name,
        started_at=run.started_at,
        ended_at=run.ended_at,
        duration_ms=_duration_ms(run.started_at, run.ended_at),
        chain_calls=[
            ChainCallLogDetail(
                id=c.id,
                chain_name=c.chain_name,
                call_order=c.call_order,
                latency_ms=c.latency_ms,
                called_at=c.called_at,
                input=c.input,
                output=c.output,
                model_name=c.model_name,
                prompt_tokens=c.prompt_tokens,
                completion_tokens=c.completion_tokens,
                total_tokens=c.total_tokens,
            )
            for c in chain_calls
        ],
    )


async def get_flow(
    db: AsyncSession, agent_id: uuid.UUID
) -> ChainFlowData:
    # Node stats: aggregate per chain from chain_call_logs
    node_rows = (
        await db.execute(
            select(
                ChainCallLog.chain_name,
                func.count().label("call_count"),
                func.avg(ChainCallLog.latency_ms).label("avg_latency_ms"),
            )
            .where(ChainCallLog.agent_id == agent_id)
            .group_by(ChainCallLog.chain_name)
            .order_by(func.count().desc())
        )
    ).all()

    nodes = [
        ChainFlowEntry(
            chain_name=row.chain_name,
            call_count=row.call_count,
            avg_latency_ms=float(row.avg_latency_ms) if row.avg_latency_ms is not None else None,
        )
        for row in node_rows
    ]

    # Edge stats: aggregate from run_edges table
    edge_rows = (
        await db.execute(
            select(
                RunEdge.source_chain,
                RunEdge.target_chain,
                func.count().label("count"),
            )
            .where(RunEdge.agent_id == agent_id)
            .group_by(RunEdge.source_chain, RunEdge.target_chain)
            .order_by(func.count().desc())
        )
    ).all()

    edges = [
        FlowEdge(source=row.source_chain, target=row.target_chain, count=row.count)
        for row in edge_rows
    ]

    return ChainFlowData(nodes=nodes, edges=edges)
