namespace CalendarBooking.Application.Common.Interfaces;

public interface IBookingEmailJobService
{
    void EnqueueBookingCreatedEmail(Guid bookingId, string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef);
    void EnqueueBookingConfirmedEmail(Guid bookingId, string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string meetUrl, string bookingRef);
    void EnqueueBookingDeclinedEmail(Guid bookingId, string bookerEmail, string ownerEmail, string date, string startTime, string endTime, string bookingRef);
    void EnqueueBookingCancelledEmail(Guid bookingId, string ownerEmail, string bookerEmail, string date, string startTime, string endTime, string bookingRef);
}
