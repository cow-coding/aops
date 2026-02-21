export interface Chain {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  persona: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ChainCreateRequest {
  name: string;
  description?: string;
  persona: string;
  content: string;
  message?: string;
}

export interface ChainUpdateRequest {
  name?: string;
  description?: string;
  persona?: string;
  content?: string;
  message?: string;
}

export interface ChainVersion {
  id: string;
  chain_id: string;
  persona: string;
  content: string;
  message: string;
  version_number: number;
  created_at: string;
}
