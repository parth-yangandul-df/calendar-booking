import apiClient from '@/api/client';

export interface AdminStats {
  totalUsers: number;
  totalBookings: number;
}

export interface AdminUserDto {
  id: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  bookingCount: number;
}

export interface AdminBookingDto {
  id: string;
  status: string;
  ownerId: string;
  ownerEmail: string;
  bookerId: string;
  bookerEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  meetUrl: string | null;
  createdAt: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface AdminBookingsParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export const adminApi = {
  getStats: () => apiClient.get<AdminStats>('/admin/stats'),
  getUsers: (params: AdminUsersParams) =>
    apiClient.get<PagedResponse<AdminUserDto>>('/admin/users', { params }),
  getBookings: (params: AdminBookingsParams) =>
    apiClient.get<PagedResponse<AdminBookingDto>>('/admin/bookings', { params }),
};
