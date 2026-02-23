import { api } from './api';
import type { ApiKey, ApiKeyCreateRequest, ApiKeyCreateResponse } from '../types/apiKey';

export const apiKeyApi = {
  list: (agentId: string) =>
    api.get<ApiKey[]>(`/agents/${agentId}/api-keys`),

  create: (agentId: string, data: ApiKeyCreateRequest) =>
    api.post<ApiKeyCreateResponse>(`/agents/${agentId}/api-keys`, data),

  revoke: (agentId: string, keyId: string) =>
    api.delete<void>(`/agents/${agentId}/api-keys/${keyId}`),
};