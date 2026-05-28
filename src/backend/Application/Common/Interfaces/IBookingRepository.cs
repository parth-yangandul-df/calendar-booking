using BookingEntity = Domain.Entities.Booking;

namespace CalendarBooking.Application.Common.Interfaces;

public interface IBookingRepository
{
    /// <summary>Returns null on slot conflict (slot already Pending or Confirmed).</summary>
    Task<BookingEntity?> CreateBookingAsync(BookingEntity booking);

    /// <summary>Pending bookings where OwnerId == ownerId (incoming requests).</summary>
    Task<List<BookingEntity>> GetIncomingBookingsAsync(string ownerId);

    /// <summary>All non-Declined bookings where BookerId == bookerId.</summary>
    Task<List<BookingEntity>> GetMyBookingsAsync(string bookerId);

    /// <summary>Confirmed bookings where OwnerId == ownerId.</summary>
    Task<List<BookingEntity>> GetOwnedConfirmedBookingsAsync(string ownerId);

    Task<BookingEntity?> GetByIdAsync(Guid id);
    Task AcceptBookingAsync(Guid id, string meetUrl, string? googleEventId = null);
    Task DeclineBookingAsync(Guid id);
    Task CancelBookingAsync(Guid id);

    /// <summary>Pending + Confirmed bookings for an owner on a specific date.</summary>
    Task<List<BookingEntity>> GetBookingsForDayAsync(string ownerId, DateOnly date);
}
