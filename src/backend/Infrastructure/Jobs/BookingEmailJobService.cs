using CalendarBooking.Application.Common.Interfaces;
using Hangfire;

namespace CalendarBooking.Infrastructure.Jobs;

public class BookingEmailJobService : IBookingEmailJobService
{
    private readonly IBackgroundJobClient _backgroundJobClient;

    public BookingEmailJobService(IBackgroundJobClient backgroundJobClient)
    {
        _backgroundJobClient = backgroundJobClient;
    }

    public void EnqueueBookingCreatedEmail(Guid bookingId, string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef)
        => _backgroundJobClient.Enqueue<SendBookingEmailJob>(job =>
            job.SendBookingCreatedAsync(ownerEmail, bookerEmail, date, startTime, endTime, bookingRef));

    public void EnqueueBookingConfirmedEmail(Guid bookingId, string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string meetUrl, string bookingRef)
        => _backgroundJobClient.Enqueue<SendBookingEmailJob>(job =>
            job.SendBookingConfirmedAsync(ownerEmail, bookerEmail, date, startTime, endTime, meetUrl, bookingRef));

    public void EnqueueBookingDeclinedEmail(Guid bookingId, string bookerEmail, string ownerEmail, string date, string startTime, string endTime, string bookingRef)
        => _backgroundJobClient.Enqueue<SendBookingEmailJob>(job =>
            job.SendBookingDeclinedAsync(bookerEmail, ownerEmail, date, startTime, endTime, bookingRef));

    public void EnqueueBookingCancelledEmail(Guid bookingId, string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef)
        => _backgroundJobClient.Enqueue<SendBookingEmailJob>(job =>
            job.SendBookingCancelledAsync(ownerEmail, bookerEmail, date, startTime, endTime, bookingRef));
}
