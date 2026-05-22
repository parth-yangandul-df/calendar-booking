import apiClient from '@/api/client';

export interface UserDto {
  id: string;
  email: string;
}

export const userApi = {
  search: (query?: string) =>
    apiClient.get<UserDto[]>('/users', { params: { search: query || undefined } }),

  getUser: (userId: string) =>
    apiClient.get<UserDto>(`/users/${userId}`),
};
