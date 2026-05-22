import apiClient from '@/api/client';

export interface TimeRangeDto {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface CalendarDayDto {
  date: string;       // "YYYY-MM-DD"
  isOverride: boolean;
  ranges: TimeRangeDto[];
}

export interface WeeklyTemplateDto {
  dayOfWeek: string;  // "Monday"
  start: string;
  end: string;
}

export interface UpsertTemplateItem {
  dayOfWeek: string;
  start: string;
  end: string;
}

export interface UpsertOverrideItem {
  start: string;
  end: string;
}

export const availabilityApi = {
  getMyCalendar: (month: string) =>
    apiClient.get<CalendarDayDto[]>('/availability/calendar', { params: { month } }),

  getUserCalendar: (userId: string, month: string) =>
    apiClient.get<CalendarDayDto[]>('/availability/calendar', { params: { userId, month } }),

  getTemplate: () =>
    apiClient.get<WeeklyTemplateDto[]>('/availability/template'),

  setTemplate: (data: { items: UpsertTemplateItem[] }) =>
    apiClient.put('/availability/template', data),

  getOverrides: (from: string, to: string) =>
    apiClient.get<CalendarDayDto[]>('/availability/overrides', { params: { from, to } }),

  saveOverride: (data: { date: string; items: UpsertOverrideItem[] }) =>
    apiClient.post('/availability/overrides', data),

  deleteOverride: (date: string, overrideId: string) =>
    apiClient.delete('/availability/overrides', { params: { date, overrideId } }),
};
