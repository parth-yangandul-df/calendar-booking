namespace CalendarBooking.Application.Booking.DTOs;

public record BookingDto(
    Guid Id,
    string OwnerId,
    string OwnerEmail,
    string BookerId,
    string BookerEmail,
    string Date,
    string StartTime,
    string EndTime,
    string Status,
    string? MeetUrl,
    string? CancelledAt,
    string CreatedAt
);
