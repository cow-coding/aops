import { authApi } from './authApi';

const API_BASE = '/api/v1';

// Module-level access token — set by AuthContext on login/refresh
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  // Auto-refresh on 401
  if (response.status === 401 && retry) {
    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (storedRefreshToken) {
      try {
        const { access_token } = await authApi.refresh(storedRefreshToken);
        setAccessToken(access_token);
        return request<T>(endpoint, options, false);
      } catch {
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      window.location.href = '/login';
      throw new Error('Not authenticated.');
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
