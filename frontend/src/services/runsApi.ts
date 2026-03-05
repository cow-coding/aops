import { api } from './api';
import type { RunSummary, RunDetail } from '../types/run';

export interface RunsListParams {
  agent_id?: string;
  started_after?: string;
  started_before?: string;
  limit?: number;
  offset?: number;
  source_chain?: string;
  target_chain?: string;
  status?: string;
}

export interface RunsListResponse {
  items: RunSummary[];
  total: number;
}

export const runsApi = {
  list: (params?: RunsListParams) => {
    const qs = new URLSearchParams();
    if (params?.agent_id) qs.set('agent_id', params.agent_id);
    if (params?.started_after) qs.set('started_after', params.started_after);
    if (params?.started_before) qs.set('started_before', params.started_before);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.source_chain) qs.set('source_chain', params.source_chain);
    if (params?.target_chain) qs.set('target_chain', params.target_chain);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<RunsListResponse>(`/runs/${query}`);
  },

  getDetail: (runId: string) => api.get<RunDetail>(`/runs/${runId}`),
  getRunError: (runId: string) => api.get<{ traceback: string }>(`/runs/${runId}/error`),
};
