import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_run import AgentRun, ChainCallLog
from app.schemas.run import AgentRunCreate, AgentRunResponse, ChainFlowData, ChainFlowEntry, FlowEdge


async def create_run(
    db: AsyncSession, agent_id: uuid.UUID, data: AgentRunCreate
) -> AgentRunResponse:
    run = AgentRun(
        agent_id=agent_id,
        started_at=data.started_at,
        ended_at=data.ended_at,
    )
    db.add(run)
    await db.flush()

    for call in data.chain_calls:
        log = ChainCallLog(
            run_id=run.id,
            agent_id=agent_id,
            chain_name=call.chain_name,
            called_at=call.called_at,
            latency_ms=call.latency_ms,
        )
        db.add(log)

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


async def get_flow(
    db: AsyncSession, agent_id: uuid.UUID
) -> ChainFlowData:
    result = await db.execute(
        select(
            ChainCallLog.run_id,
            ChainCallLog.chain_name,
            ChainCallLog.latency_ms,
        )
        .where(ChainCallLog.agent_id == agent_id)
        .order_by(ChainCallLog.run_id, ChainCallLog.called_at)
    )
    rows = result.all()

    node_stats: dict[str, dict] = defaultdict(lambda: {"count": 0, "lat_sum": 0, "lat_cnt": 0})
    edge_counts: dict[tuple[str, str], int] = defaultdict(int)

    current_run = None
    prev_chain = None
    for row in rows:
        if row.run_id != current_run:
            current_run = row.run_id
            prev_chain = None
        node_stats[row.chain_name]["count"] += 1
        if row.latency_ms is not None:
            node_stats[row.chain_name]["lat_sum"] += row.latency_ms
            node_stats[row.chain_name]["lat_cnt"] += 1
        if prev_chain:
            edge_counts[(prev_chain, row.chain_name)] += 1
        prev_chain = row.chain_name

    nodes = [
        ChainFlowEntry(
            chain_name=name,
            call_count=stats["count"],
            avg_latency_ms=(
                stats["lat_sum"] / stats["lat_cnt"] if stats["lat_cnt"] > 0 else None
            ),
        )
        for name, stats in sorted(node_stats.items(), key=lambda x: -x[1]["count"])
    ]

    edges = [
        FlowEdge(source=src, target=tgt, count=cnt)
        for (src, tgt), cnt in sorted(edge_counts.items(), key=lambda x: -x[1])
    ]

    return ChainFlowData(nodes=nodes, edges=edges)
