namespace CalendarBooking.Application.Availability.DTOs;

public record AvailabilityOverrideDto(string Date, string Start, string End, Guid Id);
