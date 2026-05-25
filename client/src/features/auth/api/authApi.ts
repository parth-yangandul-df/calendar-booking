import apiClient from '@/api/client';

export interface AuthResponse {
  email: string;
  isAdmin: boolean;
}

export const authApi = {
  register: (data: { email: string; password: string; confirmPassword: string }) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data, { _skipRefresh: true } as any),

  refresh: () =>
    apiClient.post<AuthResponse>('/auth/refresh'),

  logout: () =>
    apiClient.post<void>('/auth/logout'),
};
