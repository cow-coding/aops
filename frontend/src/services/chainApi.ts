import { api } from './api';
import type { Chain, ChainCreateRequest, ChainUpdateRequest, ChainVersion, ChainStats, ChainLog, ChainTimeseries } from '../types/chain';

export interface ChainStatsSummaryItem {
  chain_name: string;
  call_count: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  median_latency_ms: number | null;
}

export interface ChainStatsSummary {
  chains: ChainStatsSummaryItem[];
}

export const chainApi = {
  list: (agentId: string) => api.get<Chain[]>(`/agents/${agentId}/chains/`),

  getById: (agentId: string, chainId: string) =>
    api.get<Chain>(`/agents/${agentId}/chains/${chainId}`),

  create: (agentId: string, data: ChainCreateRequest) =>
    api.post<Chain>(`/agents/${agentId}/chains/`, data),

  update: (agentId: string, chainId: string, data: ChainUpdateRequest) =>
    api.patch<Chain>(`/agents/${agentId}/chains/${chainId}`, data),

  delete: (agentId: string, chainId: string) =>
    api.delete<void>(`/agents/${agentId}/chains/${chainId}`),

  getVersions: (agentId: string, chainId: string) =>
    api.get<ChainVersion[]>(`/agents/${agentId}/chains/${chainId}/versions/`),

  getVersion: (agentId: string, chainId: string, versionId: string) =>
    api.get<ChainVersion>(`/agents/${agentId}/chains/${chainId}/versions/${versionId}`),

  rollback: (agentId: string, chainId: string, versionId: string) =>
    api.post<Chain>(`/agents/${agentId}/chains/${chainId}/versions/${versionId}/rollback`),

  reorder: (agentId: string, chainIds: string[]) =>
    api.patch<void>(`/agents/${agentId}/chains/reorder`, { chain_ids: chainIds }),

  getStats: (agentId: string, chainId: string, params?: { started_after?: string; started_before?: string }) => {
    const qs = new URLSearchParams();
    if (params?.started_after) qs.set('started_after', params.started_after);
    if (params?.started_before) qs.set('started_before', params.started_before);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ChainStats>(`/agents/${agentId}/chains/${chainId}/stats${query}`);
  },

  getChainStatsSummary: (agentId: string) =>
    api.get<ChainStatsSummary>(`/agents/${agentId}/chains/stats/summary`),

  getLogs: (agentId: string, chainId: string, params?: { limit?: number; offset?: number; slow_only?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.slow_only) qs.set('slow_only', 'true');
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<{ items: ChainLog[]; total: number }>(`/agents/${agentId}/chains/${chainId}/logs${query}`);
  },

  getTimeseries: (agentId: string, chainId: string, params: import('../components/TimeRangeSelector').TimeseriesParams) => {
    const qs = new URLSearchParams();
    if (params.range) qs.set('range', params.range);
    if (params.started_after) qs.set('started_after', params.started_after);
    if (params.started_before) qs.set('started_before', params.started_before);
    if (params.granularity) qs.set('granularity', params.granularity);
    return api.get<ChainTimeseries>(`/agents/${agentId}/chains/${chainId}/stats/timeseries?${qs.toString()}`);
  },
};
