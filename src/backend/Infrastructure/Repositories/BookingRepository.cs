using System.Data;
using CalendarBooking.Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CalendarBooking.Infrastructure.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly ApplicationDbContext _context;

    public BookingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Domain.Entities.Booking?> CreateBookingAsync(Domain.Entities.Booking booking)
    {
        using var tx = await _context.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        try
        {
            // Pessimistic locking: UPDLOCK + ROWLOCK prevents double-booking
            var conflicts = await _context.Bookings
                .FromSqlRaw(
                    "SELECT * FROM Bookings WITH (UPDLOCK, ROWLOCK) WHERE OwnerId = {0} AND Date = {1} AND Status IN (0, 1) AND StartTime < {2} AND EndTime > {3}",
                    booking.OwnerId,
                    booking.Date,
                    booking.EndTime,
                    booking.StartTime)
                .CountAsync();

            if (conflicts > 0)
            {
                await tx.RollbackAsync();
                return null;
            }

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return booking;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<List<Domain.Entities.Booking>> GetIncomingBookingsAsync(string ownerId)
    {
        return await _context.Bookings
            .Where(b => b.OwnerId == ownerId && b.Status == BookingStatus.Pending)
            .OrderBy(b => b.Date)
            .ThenBy(b => b.StartTime)
            .ToListAsync();
    }

    public async Task<List<Domain.Entities.Booking>> GetMyBookingsAsync(string bookerId)
    {
        return await _context.Bookings
            .Where(b => b.BookerId == bookerId && b.Status != BookingStatus.Declined)
            .OrderBy(b => b.Date)
            .ThenBy(b => b.StartTime)
            .ToListAsync();
    }

    public async Task<List<Domain.Entities.Booking>> GetOwnedConfirmedBookingsAsync(string ownerId)
    {
        return await _context.Bookings
            .Where(b => b.OwnerId == ownerId && b.Status == BookingStatus.Confirmed)
            .OrderBy(b => b.Date)
            .ThenBy(b => b.StartTime)
            .ToListAsync();
    }

    public async Task<Domain.Entities.Booking?> GetByIdAsync(Guid id)
    {
        return await _context.Bookings.FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task AcceptBookingAsync(Guid id, string meetUrl, string? googleEventId = null)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking is null) return;
        booking.Status = BookingStatus.Confirmed;
        booking.MeetUrl = meetUrl;
        booking.GoogleEventId = googleEventId;
        await _context.SaveChangesAsync();
    }

    public async Task DeclineBookingAsync(Guid id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking is null) return;
        booking.Status = BookingStatus.Declined;
        await _context.SaveChangesAsync();
    }

    public async Task CancelBookingAsync(Guid id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking is null) return;
        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<Domain.Entities.Booking>> GetBookingsForDayAsync(string ownerId, DateOnly date)
    {
        return await _context.Bookings
            .Where(b => b.OwnerId == ownerId && b.Date == date &&
                        (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed))
            .OrderBy(b => b.StartTime)
            .ToListAsync();
    }
}
