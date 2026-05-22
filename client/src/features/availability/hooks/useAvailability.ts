import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { availabilityApi, type UpsertOverrideItem, type UpsertTemplateItem } from '../api/availabilityApi';
import { userApi } from '../api/userApi';

export function useMyCalendar(yearMonth: string) {
  return useQuery({
    queryKey: ['availability', 'calendar', yearMonth],
    queryFn: () => availabilityApi.getMyCalendar(yearMonth).then((r) => r.data),
  });
}

export function useUserCalendar(userId: string, yearMonth: string) {
  return useQuery({
    queryKey: ['availability', 'calendar', userId, yearMonth],
    queryFn: () => availabilityApi.getUserCalendar(userId, yearMonth).then((r) => r.data),
    enabled: !!userId,
  });
}

export function useUserSearch(searchQuery: string) {
  return useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: () => userApi.search(searchQuery).then((r) => r.data),
    enabled: searchQuery.trim().length > 0,
  });
}

export function useSaveOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (override: { date: string; items: UpsertOverrideItem[] }) =>
      availabilityApi.saveOverride(override),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', 'calendar'] });
      toast.success('Availability saved');
    },
    onError: () => toast.error('Failed to save availability'),
  });
}

export function useSaveTemplate() {
  return useMutation({
    mutationFn: (data: { items: UpsertTemplateItem[] }) =>
      availabilityApi.setTemplate(data),
    onSuccess: () => {
      toast.success('Weekly template saved');
    },
    onError: () => toast.error('Failed to save template'),
  });
}
