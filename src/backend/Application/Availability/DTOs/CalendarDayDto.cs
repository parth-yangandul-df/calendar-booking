namespace CalendarBooking.Application.Availability.DTOs;

public record CalendarDayDto(string Date, bool IsOverride, List<TimeRangeDto> Ranges);
