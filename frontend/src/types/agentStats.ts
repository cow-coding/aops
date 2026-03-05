export interface AgentStats {
  total_runs: number;
  success_count: number;
  error_count: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  trend: {
    total_runs_pct: number | null;
    avg_latency_pct: number | null;
    p95_latency_pct: number | null;
  };
}

export interface AgentTimeseriesBucket {
  ts: string;
  run_count: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
}

export interface AgentTimeseries {
  buckets: AgentTimeseriesBucket[];
  trend: {
    total_runs_pct: number | null;
    avg_latency_pct: number | null;
    p95_latency_pct: number | null;
  };
}
