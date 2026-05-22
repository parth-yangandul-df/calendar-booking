namespace CalendarBooking.Application.Availability.DTOs;

public record UpsertOverrideItem(string Start, string End);

public record UpsertOverrideRequest(string Date, List<UpsertOverrideItem> Items);
