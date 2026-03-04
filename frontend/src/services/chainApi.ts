import { api } from './api';
import type { Chain, ChainCreateRequest, ChainUpdateRequest, ChainVersion, ChainStats, ChainLog } from '../types/chain';

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

  getStats: (agentId: string, chainId: string) =>
    api.get<ChainStats>(`/agents/${agentId}/chains/${chainId}/stats`),

  getLogs: (agentId: string, chainId: string, params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ChainLog[]>(`/agents/${agentId}/chains/${chainId}/logs${query}`);
  },
};
