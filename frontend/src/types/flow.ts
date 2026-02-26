export interface FlowNode {
  chain_name: string;
  call_count: number;
}

export interface FlowEdge {
  source: string;
  target: string;
  count: number;
}

export interface AgentFlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
