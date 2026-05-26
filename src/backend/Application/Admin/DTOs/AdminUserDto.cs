namespace CalendarBooking.Application.Admin.DTOs;

public record AdminUserDto(
    string Id,
    string Email,
    DateTime CreatedAt,
    bool IsAdmin,
    int BookingCount
);
