using CalendarBooking.Application.Common.Interfaces;
using CalendarBooking.Infrastructure.Email;
using Microsoft.Extensions.Logging;

namespace CalendarBooking.Infrastructure.Jobs;

public class SendBookingEmailJob
{
    private readonly IEmailService _emailService;
    private readonly ILogger<SendBookingEmailJob> _logger;

    public SendBookingEmailJob(IEmailService emailService, ILogger<SendBookingEmailJob> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    public async Task SendBookingCreatedAsync(string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingCreated(date, startTime);
        await TrySendAsync(ownerEmail, ownerEmail, subject,
            BookingEmailTemplates.BookingCreatedOwnerEmail(bookerEmail, date, startTime, endTime, bookingRef));
        await TrySendAsync(bookerEmail, bookerEmail, subject,
            BookingEmailTemplates.BookingCreatedBookerEmail(ownerEmail, date, startTime, endTime, bookingRef));
    }

    public async Task SendBookingConfirmedAsync(string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string meetUrl, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingConfirmed(date, startTime);
        await TrySendAsync(bookerEmail, bookerEmail, subject,
            BookingEmailTemplates.BookingConfirmedBookerEmail(ownerEmail, date, startTime, endTime, meetUrl, bookingRef));
        await TrySendAsync(ownerEmail, ownerEmail, subject,
            BookingEmailTemplates.BookingConfirmedOwnerEmail(bookerEmail, date, startTime, endTime, meetUrl, bookingRef));
    }

    public async Task SendBookingDeclinedAsync(string bookerEmail, string ownerEmail, string date, string startTime, string endTime, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingDeclined(date, startTime);
        await TrySendAsync(bookerEmail, bookerEmail, subject,
            BookingEmailTemplates.BookingDeclinedBookerEmail(ownerEmail, date, startTime, endTime, bookingRef));
        await TrySendAsync(ownerEmail, ownerEmail, subject,
            BookingEmailTemplates.BookingDeclinedOwnerEmail(bookerEmail, date, startTime, endTime, bookingRef));
    }

    public async Task SendBookingCancelledAsync(string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingCancelled(date, startTime);
        await TrySendAsync(ownerEmail, ownerEmail, subject,
            BookingEmailTemplates.BookingCancelledOwnerEmail(bookerEmail, date, startTime, endTime, bookingRef));
        await TrySendAsync(bookerEmail, bookerEmail, subject,
            BookingEmailTemplates.BookingCancelledBookerEmail(ownerEmail, date, startTime, endTime, bookingRef));
    }

    private async Task TrySendAsync(string toAddress, string toName, string subject, string body)
    {
        try
        {
            await _emailService.SendAsync(toAddress, toName, subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send email to {Email}", toAddress);
        }
    }
}
