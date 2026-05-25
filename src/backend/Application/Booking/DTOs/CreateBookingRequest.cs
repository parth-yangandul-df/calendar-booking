namespace CalendarBooking.Application.Booking.DTOs;

public record CreateBookingRequest(
    string OwnerId,
    string Date,
    string StartTime,
    string EndTime
);
