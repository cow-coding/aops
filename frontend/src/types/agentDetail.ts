import type { Agent } from './agent';
import type { Chain } from './chain';
import type { ApiKey } from './apiKey';

export interface AgentDetailContext {
  agent: Agent;
  setAgent: React.Dispatch<React.SetStateAction<Agent>>;
  chains: Chain[];
  apiKeys: ApiKey[];
  setChains: React.Dispatch<React.SetStateAction<Chain[]>>;
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
}
