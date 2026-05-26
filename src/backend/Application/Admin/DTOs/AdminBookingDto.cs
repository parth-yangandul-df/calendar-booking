namespace CalendarBooking.Application.Admin.DTOs;

public record AdminBookingDto(
    Guid Id,
    string Status,
    string OwnerId,
    string OwnerEmail,
    string BookerId,
    string BookerEmail,
    string Date,
    string StartTime,
    string EndTime,
    string? MeetUrl,
    DateTime CreatedAt
);
