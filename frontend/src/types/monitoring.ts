export interface MonitoringKPI {
  total_runs: number;
  error_rate: number;       // 0.0–1.0
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  trend: {
    total_runs_pct: number | null;
    error_rate_pct: number | null;
    avg_latency_pct: number | null;
    p95_latency_pct: number | null;
  };
}

export type AgentHealthStatus = 'healthy' | 'warning' | 'critical' | 'dormant' | 'down' | 'degraded';

export interface AgentHealthRow {
  agent_id: string;
  agent_name: string;
  runs: number;
  error_rate: number;       // 0.0–1.0
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  null_rate: number;        // 0.0–1.0 (null output rate)
  status: AgentHealthStatus;
  last_run_at: string | null;
  availability: 'up' | 'down' | 'degraded' | null;
  availability_latency_ms: number | null;
}

export interface SlowChainRow {
  agent_id: string;
  agent_name: string;
  chain_name: string;
  chain_id?: string;
  p95_latency_ms: number;
  calls: number;
}

export interface MonitoringSummary {
  kpi: MonitoringKPI;
  agent_health: AgentHealthRow[];
  slow_chains: SlowChainRow[];
  range_hours: number;
}
