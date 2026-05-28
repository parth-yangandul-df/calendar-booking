import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookingApi, type CreateBookingRequest } from '../api/bookingApi';
import type { AxiosError } from 'axios';

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.getBookings().then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useAcceptBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.acceptBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['slots'], refetchType: 'all' });
      toast.success('Booking confirmed. A meeting link has been attached.');
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.');
    },
  });
}

export function useDeclineBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.declineBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['slots'], refetchType: 'all' });
      toast.success('Booking declined.');
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.');
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['slots'], refetchType: 'all' });
      toast.success('Booking cancelled.');
    },
    onError: (error: AxiosError<{ title?: string }>) => {
      if (error.response?.status === 400) {
        toast.error(error.response.data?.title ?? 'Cannot cancel within 24 hours of the booking');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingApi.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['slots'], refetchType: 'all' });
      toast.success('Request sent — awaiting approval.');
    },
    onError: (error: AxiosError<{ title?: string }>) => {
      if (error.response?.status === 409) {
        toast.error('This time slot has already been booked. Please choose another.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  });
}

export function useAvailableSlots(ownerId: string | undefined, date: string | null) {
  return useQuery({
    queryKey: ['slots', ownerId, date],
    queryFn: () => bookingApi.getAvailableSlots(ownerId!, date!).then((r) => r.data),
    enabled: !!ownerId && !!date,
  });
}
