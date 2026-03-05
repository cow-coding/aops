import { api } from './api';
import type { Agent, AgentCreateRequest, AgentUpdateRequest } from '../types/agent';
import type { AgentStats, AgentTimeseries } from '../types/agentStats';

export const agentApi = {
  list: () => api.get<Agent[]>('/agents/'),

  getById: (id: string) => api.get<Agent>(`/agents/${id}`),

  create: (data: AgentCreateRequest) => api.post<Agent>('/agents/', data),

  update: (id: string, data: AgentUpdateRequest) =>
    api.patch<Agent>(`/agents/${id}`, data),

  delete: (id: string) => api.delete<void>(`/agents/${id}`),

  getStats: (id: string) => api.get<AgentStats>(`/agents/${id}/stats`),

  getTimeseries: (id: string, range: '1h' | '24h' | '7d' | '30d') =>
    api.get<AgentTimeseries>(`/agents/${id}/stats/timeseries?range=${range}`),
};
