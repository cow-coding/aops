export interface HealthConfig {
  id: string;
  agent_id: string;
  health_url: string;
  interval_sec: number;
  timeout_sec: number;
  enabled: boolean;
  consecutive_failures_threshold: number;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthCheckLog {
  id: string;
  agent_id: string;
  checked_at: string;
  status: 'up' | 'down';
  latency_ms: number | null;
  status_code: number | null;
  error_message: string | null;
}

export interface HealthConfigCreateRequest {
  health_url: string;
  interval_sec: number;
  timeout_sec: number;
  enabled: boolean;
  consecutive_failures_threshold?: number;
}

export interface HealthConfigUpdateRequest {
  health_url?: string;
  interval_sec?: number;
  timeout_sec?: number;
  enabled?: boolean;
  consecutive_failures_threshold?: number;
}
