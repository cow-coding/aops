import { api } from './api';
import type { Agent, AgentCreateRequest, AgentUpdateRequest } from '../types/agent';
import type { AgentStats, AgentTimeseries } from '../types/agentStats';
import type { TimeseriesParams } from '../components/TimeRangeSelector';

export const agentApi = {
  list: () => api.get<Agent[]>('/agents/'),

  getById: (id: string) => api.get<Agent>(`/agents/${id}`),

  create: (data: AgentCreateRequest) => api.post<Agent>('/agents/', data),

  update: (id: string, data: AgentUpdateRequest) =>
    api.patch<Agent>(`/agents/${id}`, data),

  delete: (id: string) => api.delete<void>(`/agents/${id}`),

  getStats: (id: string, params?: { started_after?: string; started_before?: string }) => {
    const qs = new URLSearchParams();
    if (params?.started_after) qs.set('started_after', params.started_after);
    if (params?.started_before) qs.set('started_before', params.started_before);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<AgentStats>(`/agents/${id}/stats${query}`);
  },

  getTimeseries: (id: string, params: TimeseriesParams) => {
    const qs = new URLSearchParams();
    if (params.range) qs.set('range', params.range);
    if (params.started_after) qs.set('started_after', params.started_after);
    if (params.started_before) qs.set('started_before', params.started_before);
    if (params.granularity) qs.set('granularity', params.granularity);
    return api.get<AgentTimeseries>(`/agents/${id}/stats/timeseries?${qs.toString()}`);
  },
};
