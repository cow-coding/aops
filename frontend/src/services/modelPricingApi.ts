import { api } from './api';

export interface ModelPricing {
  id: string;
  model_name: string;
  provider: string;
  input_cost_per_token: number | null;
  output_cost_per_token: number | null;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
  supports_vision: boolean;
  supports_function_calling: boolean;
  updated_at: string | null;
}

export interface ModelPricingListParams {
  provider?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ModelPricingListResponse {
  items: ModelPricing[];
  total: number;
}

export interface ActiveModel {
  model_name: string;
  provider: string | null;
  call_count: number;
  last_used_at: string | null;
  input_cost_per_token: number | null;
  output_cost_per_token: number | null;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost: number | null;
}

export interface CostSummary {
  total_cost: number | null;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  by_model: ActiveModel[];
  period_start: string | null;
  period_end: string | null;
}

export interface CostByAgentItem {
  agent_id: string;
  agent_name: string;
  run_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost: number | null;
  avg_cost_per_run: number | null;
}

export interface CostByAgentResponse {
  items: CostByAgentItem[];
  total_cost: number | null;
  total_runs: number;
  total_tokens: number;
}

export interface CostTimeseriesBucket {
  bucket: string;
  group: string;
  cost: number;
  tokens: number;
}

export interface CostTimeseriesResponse {
  buckets: CostTimeseriesBucket[];
  period_hours: number | null;
}

export interface CostByChainItem {
  agent_id: string;
  agent_name: string;
  chain_name: string;
  call_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost: number | null;
}

export interface CostByChainResponse {
  items: CostByChainItem[];
  total_cost: number | null;
}

export const modelPricingApi = {
  list: (params?: ModelPricingListParams) => {
    const qs = new URLSearchParams();
    if (params?.provider) qs.set('provider', params.provider);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ModelPricingListResponse>(`/model-pricing/${query}`);
  },

  sync: () => api.post<{ synced: number }>('/model-pricing/sync'),

  active: () => api.get<ActiveModel[]>('/model-pricing/active'),

  costSummary: (hours?: number) => {
    const qs = new URLSearchParams();
    if (hours !== undefined) qs.set('hours', String(hours));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<CostSummary>(`/model-pricing/cost-summary${query}`);
  },

  costByAgent: (hours?: number, limit?: number) => {
    const qs = new URLSearchParams();
    if (hours !== undefined) qs.set('hours', String(hours));
    if (limit !== undefined) qs.set('limit', String(limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<CostByAgentResponse>(`/model-pricing/cost-by-agent${query}`);
  },

  costByChain: (hours?: number, agentId?: string): Promise<CostByChainResponse> => {
    const qs = new URLSearchParams();
    if (hours !== undefined) qs.set('hours', String(hours));
    if (agentId !== undefined) qs.set('agent_id', agentId);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<CostByChainResponse>(`/model-pricing/cost-by-chain${query}`);
  },

  costTimeseries: (hours?: number, groupBy?: 'agent' | 'model', agentId?: string) => {
    const qs = new URLSearchParams();
    if (hours !== undefined) qs.set('hours', String(hours));
    if (groupBy !== undefined) qs.set('group_by', groupBy);
    if (agentId !== undefined) qs.set('agent_id', agentId);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<CostTimeseriesResponse>(`/model-pricing/cost-timeseries${query}`);
  },
};
