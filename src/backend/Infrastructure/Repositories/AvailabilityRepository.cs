using CalendarBooking.Application.Availability.DTOs;
using CalendarBooking.Application.Common.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CalendarBooking.Infrastructure.Repositories;

public class AvailabilityRepository : IAvailabilityRepository
{
    private readonly ApplicationDbContext _context;

    public AvailabilityRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<WeeklyTemplate>> GetTemplateAsync(string userId)
    {
        return await _context.WeeklyTemplates
            .Where(wt => wt.UserId == userId)
            .ToListAsync();
    }

    public async Task SetTemplateAsync(string userId, List<UpsertTemplateItem> items)
    {
        var existing = await _context.WeeklyTemplates
            .Where(wt => wt.UserId == userId)
            .ToListAsync();

        _context.WeeklyTemplates.RemoveRange(existing);

        var newRows = items.Select(i => new WeeklyTemplate
        {
            UserId = userId,
            DayOfWeek = Enum.Parse<DayOfWeek>(i.DayOfWeek, ignoreCase: true),
            StartTime = TimeOnly.Parse(i.Start),
            EndTime = TimeOnly.Parse(i.End)
        }).ToList();

        await _context.WeeklyTemplates.AddRangeAsync(newRows);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AvailabilityOverride>> GetOverridesAsync(string userId, DateOnly from, DateOnly to)
    {
        return await _context.AvailabilityOverrides
            .Where(ao => ao.UserId == userId && ao.Date >= from && ao.Date <= to)
            .ToListAsync();
    }

    public async Task SetOverrideAsync(string userId, DateOnly date, List<UpsertOverrideItem> items)
    {
        var existing = await _context.AvailabilityOverrides
            .Where(ao => ao.UserId == userId && ao.Date == date)
            .ToListAsync();

        _context.AvailabilityOverrides.RemoveRange(existing);

        var newRows = items.Select(i => new AvailabilityOverride
        {
            UserId = userId,
            Date = date,
            StartTime = TimeOnly.Parse(i.Start),
            EndTime = TimeOnly.Parse(i.End)
        }).ToList();

        await _context.AvailabilityOverrides.AddRangeAsync(newRows);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteOverrideAsync(string userId, DateOnly date, Guid overrideId)
    {
        var overrideEntry = await _context.AvailabilityOverrides
            .FirstOrDefaultAsync(ao => ao.Id == overrideId && ao.UserId == userId && ao.Date == date);

        if (overrideEntry != null)
        {
            _context.AvailabilityOverrides.Remove(overrideEntry);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<CalendarDayDto>> GetCalendarAsync(string userId, string month)
    {
        var parts = month.Split('-');
        var year = int.Parse(parts[0]);
        var monthNum = int.Parse(parts[1]);
        var startDate = new DateOnly(year, monthNum, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var template = await _context.WeeklyTemplates
            .Where(wt => wt.UserId == userId)
            .ToListAsync();

        var overrides = await _context.AvailabilityOverrides
            .Where(ao => ao.UserId == userId && ao.Date >= startDate && ao.Date <= endDate)
            .ToListAsync();

        var result = new List<CalendarDayDto>();
        var current = startDate;

        while (current <= endDate)
        {
            var dayOverrides = overrides.Where(o => o.Date == current).ToList();

            if (dayOverrides.Count > 0)
            {
                result.Add(new CalendarDayDto(
                    current.ToString("yyyy-MM-dd"),
                    true,
                    dayOverrides.Select(o => new TimeRangeDto(
                        o.StartTime.ToString("HH:mm"),
                        o.EndTime.ToString("HH:mm")
                    )).ToList()
                ));
            }
            else
            {
                var dayTemplate = template.Where(t => t.DayOfWeek == current.DayOfWeek).ToList();
                result.Add(new CalendarDayDto(
                    current.ToString("yyyy-MM-dd"),
                    false,
                    dayTemplate.Select(t => new TimeRangeDto(
                        t.StartTime.ToString("HH:mm"),
                        t.EndTime.ToString("HH:mm")
                    )).ToList()
                ));
            }

            current = current.AddDays(1);
        }

        return result;
    }
}
