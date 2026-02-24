import { api } from './api';
import type { Agent, AgentCreateRequest, AgentUpdateRequest } from '../types/agent';

export const agentApi = {
  list: () => api.get<Agent[]>('/agents/'),

  getById: (id: string) => api.get<Agent>(`/agents/${id}`),

  create: (data: AgentCreateRequest) => api.post<Agent>('/agents/', data),

  update: (id: string, data: AgentUpdateRequest) =>
    api.patch<Agent>(`/agents/${id}`, data),

  delete: (id: string) => api.delete<void>(`/agents/${id}`),
};
