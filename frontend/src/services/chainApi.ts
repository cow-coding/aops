import { api } from './api';
import type { Chain, ChainCreateRequest, ChainUpdateRequest, ChainVersion } from '../types/chain';

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
};
