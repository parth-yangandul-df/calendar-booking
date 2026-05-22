using CalendarBooking.Application.Availability.DTOs;
using Domain.Entities;

namespace CalendarBooking.Application.Common.Interfaces;

public interface IAvailabilityRepository
{
    Task<List<CalendarDayDto>> GetCalendarAsync(string userId, string month);
    Task<List<WeeklyTemplate>> GetTemplateAsync(string userId);
    Task SetTemplateAsync(string userId, List<UpsertTemplateItem> items);
    Task<List<AvailabilityOverride>> GetOverridesAsync(string userId, DateOnly from, DateOnly to);
    Task SetOverrideAsync(string userId, DateOnly date, List<UpsertOverrideItem> items);
    Task DeleteOverrideAsync(string userId, DateOnly date, Guid overrideId);
}
