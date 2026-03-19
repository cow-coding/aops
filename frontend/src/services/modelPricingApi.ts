import { api } from './api';

export interface ModelPricing {
  id: string;
  model_name: string;
  provider: string;
  input_cost_per_token: number | null;
  output_cost_per_token: number | null;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
  supports_vision: boolean;
  supports_function_calling: boolean;
  updated_at: string | null;
}

export interface ModelPricingListParams {
  provider?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ModelPricingListResponse {
  items: ModelPricing[];
  total: number;
}

export interface ActiveModel {
  model_name: string;
  provider: string | null;
  call_count: number;
  last_used_at: string | null;
  input_cost_per_token: number | null;
  output_cost_per_token: number | null;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
}

export const modelPricingApi = {
  list: (params?: ModelPricingListParams) => {
    const qs = new URLSearchParams();
    if (params?.provider) qs.set('provider', params.provider);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ModelPricingListResponse>(`/model-pricing/${query}`);
  },

  sync: () => api.post<{ synced: number }>('/model-pricing/sync'),

  active: () => api.get<ActiveModel[]>('/model-pricing/active'),
};
