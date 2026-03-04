export interface RunSummary {
  id: string;
  agent_id: string;
  agent_name: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  chain_names: string[];
}

export interface RunChainCall {
  id: string;
  chain_name: string;
  call_order: number;
  latency_ms: number | null;
  called_at: string;
  input: string | null;
  output: string | null;
}

export interface RunDetail {
  id: string;
  agent_id: string;
  agent_name: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  chain_calls: RunChainCall[];
}
