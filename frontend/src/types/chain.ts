export interface Chain {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  persona: string | null;
  content: string;
  position: number;
  show_in_flow: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChainCreateRequest {
  name: string;
  description?: string;
  persona?: string;
  content: string;
  message?: string;
}

export interface ChainUpdateRequest {
  name?: string;
  description?: string;
  persona?: string | null;
  content?: string;
  message?: string;
  show_in_flow?: boolean;
}

export interface ChainStats {
  total_calls: number;
  runs_appeared_in: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  last_called_at: string | null;
}

export interface ChainLog {
  id: string;
  run_id: string;
  call_order: number;
  latency_ms: number | null;
  called_at: string;
  input: string | null;
  output: string | null;
  status: 'success' | 'error';
  error_message: string | null;
}

export interface ChainVersion {
  id: string;
  chain_id: string;
  persona: string | null;
  content: string;
  message: string;
  version_number: number;
  created_at: string;
}

export interface TimeseriesBucket {
  ts: string;
  call_count: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
}

export interface ChainTimeseries {
  buckets: TimeseriesBucket[];
  trend: {
    calls_pct: number | null;
    avg_latency_pct: number | null;
    p95_latency_pct: number | null;
  };
}
