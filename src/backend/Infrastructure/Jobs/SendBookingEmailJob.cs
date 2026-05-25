using CalendarBooking.Application.Common.Interfaces;
using CalendarBooking.Infrastructure.Email;

namespace CalendarBooking.Infrastructure.Jobs;

public class SendBookingEmailJob
{
    private readonly IEmailService _emailService;

    public SendBookingEmailJob(IEmailService emailService)
    {
        _emailService = emailService;
    }

    public async Task SendBookingCreatedAsync(string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingCreated(date, startTime);
        var body = BookingEmailTemplates.BookingCreatedOwnerEmail(bookerEmail, date, startTime, endTime, bookingRef);
        await _emailService.SendAsync(ownerEmail, ownerEmail, subject, body);
    }

    public async Task SendBookingConfirmedAsync(string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string meetUrl, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingConfirmed(date, startTime);
        await _emailService.SendAsync(bookerEmail, bookerEmail, subject,
            BookingEmailTemplates.BookingConfirmedBookerEmail(ownerEmail, date, startTime, endTime, meetUrl, bookingRef));
        await _emailService.SendAsync(ownerEmail, ownerEmail, subject,
            BookingEmailTemplates.BookingConfirmedOwnerEmail(bookerEmail, date, startTime, endTime, meetUrl, bookingRef));
    }

    public async Task SendBookingDeclinedAsync(string bookerEmail, string ownerEmail, string date, string startTime, string endTime, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingDeclined(date, startTime);
        var body = BookingEmailTemplates.BookingDeclinedBookerEmail(ownerEmail, date, startTime, endTime, bookingRef);
        await _emailService.SendAsync(bookerEmail, bookerEmail, subject, body);
    }

    public async Task SendBookingCancelledAsync(string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef)
    {
        var subject = BookingEmailTemplates.SubjectBookingCancelled(date, startTime);
        await _emailService.SendAsync(ownerEmail, ownerEmail, subject,
            BookingEmailTemplates.BookingCancelledEmail(bookerEmail, date, startTime, endTime, bookingRef));
        await _emailService.SendAsync(bookerEmail, bookerEmail, subject,
            BookingEmailTemplates.BookingCancelledEmail(ownerEmail, date, startTime, endTime, bookingRef));
    }
}
