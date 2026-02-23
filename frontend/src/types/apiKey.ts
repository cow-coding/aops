export interface ApiKey {
  id: string;
  agent_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreateRequest {
  name: string;
}

export interface ApiKeyCreateResponse extends ApiKey {
  key: string;
}