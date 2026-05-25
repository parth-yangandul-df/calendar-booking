import apiClient from '@/api/client';

export interface BookingDto {
  id: string;
  ownerId: string;
  ownerEmail: string;
  bookerId: string;
  bookerEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Pending' | 'Confirmed' | 'Declined' | 'Cancelled';
  meetUrl: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface GetBookingsResponse {
  incoming: BookingDto[];
  myBookings: BookingDto[];
  ownedConfirmed: BookingDto[];
}

export interface CreateBookingRequest {
  ownerId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface BookingSlotDto {
  startTime: string;
  endTime: string;
  status: string;
}

export interface SlotsResponse {
  availableSlots: Array<{ start: string; end: string }>;
  bookedSlots: BookingSlotDto[];
}

export const bookingApi = {
  getBookings: () => apiClient.get<GetBookingsResponse>('/bookings'),
  createBooking: (data: CreateBookingRequest) => apiClient.post<BookingDto>('/bookings', data),
  acceptBooking: (id: string) => apiClient.patch<BookingDto>('/bookings/' + id + '/accept'),
  declineBooking: (id: string) => apiClient.patch('/bookings/' + id + '/decline'),
  cancelBooking: (id: string) => apiClient.delete('/bookings/' + id),
  getAvailableSlots: (ownerId: string, date: string) =>
    apiClient.get<SlotsResponse>('/availability/slots', { params: { ownerId, date } }),
};
