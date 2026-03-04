import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
} from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { Edge, Node, NodeProps } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import type { Chain } from '../../types/chain';
import type { AgentDetailContext } from '../../types/agentDetail';
import { flowApi } from '../../services/flowApi';
import { chainApi } from '../../services/chainApi';
import type { ChainFlowData } from '../../services/flowApi';

// ── Node data type ────────────────────────────────────────────────────────────

interface FlowChainNodeData extends Record<string, unknown> {
  chainName: string;
  callCount: number;
  avgLatencyMs: number | null;
  unexecuted: boolean;
  onHide: (() => void) | null;
  agentId: string;
}

type FlowChainNode = Node<FlowChainNodeData>;

// ── ChainNode component ───────────────────────────────────────────────────────

function ChainNode({ id, data, selected }: NodeProps<FlowChainNode>) {
  const theme = useTheme();
  const colors = theme.colors;
  const navigate = useNavigate();

  const statsLabel = [
    data.callCount > 0 ? `${data.callCount} ${data.callCount === 1 ? 'call' : 'calls'}` : null,
    data.avgLatencyMs !== null ? `~${Math.round(data.avgLatencyMs)}ms` : null,
  ]
    .filter(Boolean)
    .join('  ');

  return (
    <Box
      onClick={() => navigate(`/agents/${data.agentId}/chains/${id}`)}
      sx={{
        width: 200,
        px: 1.5,
        py: 1.25,
        borderRadius: '8px',
        background: colors.canvas.subtle,
        border: data.unexecuted
          ? `1px dashed ${colors.border.default}`
          : `1px solid ${selected ? colors.accent.emphasis : colors.border.default}`,
        boxShadow: !data.unexecuted && selected ? `0 0 0 2px ${colors.accent.subtle}` : 'none',
        opacity: data.unexecuted ? 0.45 : 1,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: data.unexecuted
            ? colors.border.hover
            : selected ? colors.accent.emphasis : colors.border.hover,
        },
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <AccountTreeOutlinedIcon sx={{ fontSize: 16, color: colors.accent.fg, flexShrink: 0 }} />
        <Typography
          sx={{
            color: colors.accent.fg,
            fontWeight: 600,
            fontSize: '0.8125rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.chainName}
        </Typography>
      </Box>
      {statsLabel && (
        <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.subtle }}>
          {statsLabel}
        </Typography>
      )}
      {data.unexecuted && (
        <Typography
          sx={{
            fontSize: '0.625rem',
            color: colors.fg.subtle,
            fontStyle: 'italic',
            mt: 0.25,
          }}
        >
          Not run yet
        </Typography>
      )}
      {data.onHide && (
        <Typography
          onClick={(e) => { e.stopPropagation(); data.onHide?.(); }}
          sx={{
            fontSize: '0.625rem',
            color: colors.fg.subtle,
            cursor: 'pointer',
            mt: 0.5,
            '&:hover': { color: colors.fg.default, textDecoration: 'underline' },
          }}
        >
          Hide from flow
        </Typography>
      )}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </Box>
  );
}

const nodeTypes = { chainNode: ChainNode };

// ── dagre layout ──────────────────────────────────────────────────────────────

function buildNodes(
  chains: Chain[],
  flowData: ChainFlowData | null,
  onHideChain: ((chainId: string) => void) | null,
  agentId: string,
): Node[] {
  const executedNames = new Set(flowData?.nodes.map((n) => n.chain_name) ?? []);
  const flowMap = new Map((flowData?.nodes ?? []).map((f) => [f.chain_name, f]));
  const nameToId = new Map(chains.map((c) => [c.name, c.id]));

  const executedChains = chains.filter((c) => executedNames.has(c.name));
  const unexecutedChains = chains.filter((c) => !executedNames.has(c.name));

  // dagre layout on executed chains only
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 50 });
  g.setDefaultEdgeLabel(() => ({}));
  executedChains.forEach((c) => g.setNode(c.id, { width: 200, height: 72 }));
  (flowData?.edges ?? []).forEach((e) => {
    const src = nameToId.get(e.source);
    const tgt = nameToId.get(e.target);
    if (src && tgt) g.setEdge(src, tgt);
  });
  if (executedChains.length > 0) dagre.layout(g);

  // rightmost edge of executed nodes
  const maxX =
    executedChains.length > 0
      ? Math.max(...executedChains.map((c) => g.node(c.id).x)) + 100
      : 0;

  const executedNodes: Node[] = executedChains.map((c) => {
    const pos = g.node(c.id);
    const entry = flowMap.get(c.name);
    return {
      id: c.id,
      type: 'chainNode',
      position: { x: pos.x - 100, y: pos.y - 36 },
      data: {
        chainName: c.name,
        callCount: entry?.call_count ?? 0,
        avgLatencyMs: entry?.avg_latency_ms ?? null,
        unexecuted: false,
        onHide: onHideChain ? () => onHideChain(c.id) : null,
        agentId,
      } satisfies FlowChainNodeData,
    };
  });

  const unexecutedNodes: Node[] = unexecutedChains.map((c, i) => ({
    id: c.id,
    type: 'chainNode',
    position: { x: maxX + 120, y: i * 88 },
    data: {
      chainName: c.name,
      callCount: 0,
      avgLatencyMs: null,
      unexecuted: true,
      onHide: onHideChain ? () => onHideChain(c.id) : null,
      agentId,
    } satisfies FlowChainNodeData,
  }));

  return [...executedNodes, ...unexecutedNodes];
}

function buildEdges(chains: Chain[], flowData: ChainFlowData | null, edgeStyle: React.CSSProperties, labelStyle: React.CSSProperties): Edge[] {
  if (!flowData?.edges.length) return [];
  const nameToId = new Map(chains.map((c) => [c.name, c.id]));
  return flowData.edges.map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: nameToId.get(e.source) ?? e.source,
    target: nameToId.get(e.target) ?? e.target,
    type: 'smoothstep',
    label: `${e.count}×`,
    labelStyle,
    style: edgeStyle,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeStyle.stroke as string,
      width: 16,
      height: 16,
    },
  }));
}

// ── Empty / overlay states ────────────────────────────────────────────────────

function NoChainState({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AccountTreeOutlinedIcon sx={{ fontSize: 48, color: colors.fg.subtle }} />
      <Typography variant="body1" sx={{ color: colors.fg.default, mt: 2, mb: 0.5, fontWeight: 500 }}>
        No chains yet
      </Typography>
      <Typography variant="body1" sx={{ color: colors.fg.muted, mb: 2.5 }}>
        Add a chain to see the flow visualization.
      </Typography>
      <Button size="small" variant="outlined" onClick={() => navigate(`/agents/${agentId}/chains`)}>
        Go to Chains
      </Button>
    </Box>
  );
}

function NoRunDataOverlay() {
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${colors.canvas.default}CC`,
        pointerEvents: 'none',
      }}
    >
      <Typography variant="body1" sx={{ color: colors.fg.default, mb: 0.5, fontWeight: 500 }}>
        No run data yet
      </Typography>
      <Typography variant="body1" sx={{ color: colors.fg.muted }}>
        Run your agent to see the flow visualization.
      </Typography>
    </Box>
  );
}

function AllHiddenOverlay() {
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${colors.canvas.default}CC`,
        pointerEvents: 'none',
      }}
    >
      <Typography variant="body1" sx={{ color: colors.fg.default, mb: 0.5, fontWeight: 500 }}>
        All chains hidden from flow
      </Typography>
      <Typography variant="body1" sx={{ color: colors.fg.muted }}>
        Enable "Show in Flow" on a chain to see it here.
      </Typography>
    </Box>
  );
}

function LoadingOverlay() {
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${colors.canvas.default}99`,
        zIndex: 5,
      }}
    >
      <CircularProgress size={32} />
    </Box>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function AgentFlowTab() {
  const { agent, chains, setChains } = useOutletContext<AgentDetailContext>();
  const theme = useTheme();
  const colors = theme.colors;
  const isDark = theme.palette.mode === 'dark';

  const [flowData, setFlowData] = useState<ChainFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    flowApi
      .getFlow(agent.id)
      .then(setFlowData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [agent.id]);

  const handleHideChain = useCallback(async (chainId: string) => {
    const original = chains.find((c) => c.id === chainId);
    if (!original) return;
    setChains((prev) => prev.map((c) => (c.id === chainId ? { ...c, show_in_flow: false } : c)));
    try {
      await chainApi.update(agent.id, chainId, { show_in_flow: false });
    } catch {
      setChains((prev) => prev.map((c) => (c.id === chainId ? original : c)));
    }
  }, [agent.id, chains, setChains]);

  const flowChains = useMemo(() => chains.filter((c) => c.show_in_flow), [chains]);

  const edgeStyle: React.CSSProperties = { stroke: colors.border.default };
  const labelStyle: React.CSSProperties = { fill: colors.fg.subtle, fontSize: '0.6875rem' };

  const nodes = useMemo(() => buildNodes(flowChains, flowData, handleHideChain, agent.id), [flowChains, flowData, handleHideChain, agent.id]);
  const edges = useMemo(() => buildEdges(flowChains, flowData, edgeStyle, labelStyle), [flowChains, flowData]);

  const hasNoChains = chains.length === 0;
  const hasAllHidden = !hasNoChains && flowChains.length === 0;
  const hasNoRunData = !hasNoChains && !hasAllHidden && (flowData?.nodes.length ?? 0) === 0;

  // No chains → no ReactFlow at all
  if (hasNoChains) {
    return (
      <Box sx={{ height: 'min(560px, calc(100vh - 300px))', position: 'relative' }}>
        <ReactFlow nodes={[]} edges={[]} nodeTypes={nodeTypes} proOptions={{ hideAttribution: true }}>
          <Background color={colors.border.muted} gap={20} variant={BackgroundVariant.Dots} />
        </ReactFlow>
        <NoChainState agentId={agent.id} />
      </Box>
    );
  }

  return (
    <Box sx={{
      height: 'min(560px, calc(100vh - 300px))',
      position: 'relative',
      ...(isDark && {
        '& .react-flow__controls-button': {
          background: colors.canvas.overlay,
          borderBottom: `1px solid ${colors.border.default}`,
          fill: colors.fg.muted,
        },
        '& .react-flow__controls-button:hover': {
          background: colors.canvas.subtle,
        },
        '& .react-flow__controls-button svg': {
          fill: colors.fg.muted,
        },
      }),
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
               fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={colors.border.muted} gap={20} variant={BackgroundVariant.Dots} />
        <Controls
          style={{
            background: colors.canvas.subtle,
            border: `1px solid ${colors.border.default}`,
            borderRadius: 6,
          }}
        />
      </ReactFlow>

      {loading && <LoadingOverlay />}
      {!loading && !error && hasAllHidden && <AllHiddenOverlay />}
      {!loading && !error && hasNoRunData && <NoRunDataOverlay />}
      {!loading && error && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="body1" sx={{ color: colors.danger.fg }}>
            {error}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
