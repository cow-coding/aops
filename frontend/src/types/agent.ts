export interface Agent {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentCreateRequest {
  name: string;
  description?: string;
}

export interface AgentUpdateRequest {
  name?: string;
  description?: string;
}
