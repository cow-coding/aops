import { api } from './api';

export interface ChainFlowEntry {
  chain_name: string;
  call_count: number;
  avg_latency_ms: number | null;
}

export interface FlowEdge {
  source: string;
  target: string;
  count: number;
}

export interface ChainFlowData {
  nodes: ChainFlowEntry[];
  edges: FlowEdge[];
}

export const flowApi = {
  getFlow: (agentId: string): Promise<ChainFlowData> =>
    api.get<ChainFlowData>(`/agents/${agentId}/flow`),
};
