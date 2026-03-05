import type { AccessTokenResponse, TokenResponse, User } from '../types/auth';
import { api } from './api';

const API_BASE = '/api/v1';

async function authRequest<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    authRequest<User>('/auth/register', data),

  login: (data: LoginRequest) =>
    authRequest<TokenResponse>('/auth/login', data),

  refresh: (refreshToken: string) =>
    authRequest<AccessTokenResponse>('/auth/refresh', { refresh_token: refreshToken }),

  logout: (refreshToken: string) =>
    authRequest<void>('/auth/logout', { refresh_token: refreshToken }),

  getMe: () => api.get<User>('/auth/me'),

  updateMe: (data: { name: string }) => api.patch<User>('/auth/me', data),
};
