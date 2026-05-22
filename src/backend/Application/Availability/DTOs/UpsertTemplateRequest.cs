namespace CalendarBooking.Application.Availability.DTOs;

public record UpsertTemplateItem(string DayOfWeek, string Start, string End);

public record UpsertTemplateRequest(List<UpsertTemplateItem> Items);
